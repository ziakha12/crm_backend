import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import twilio from "twilio";
import cron from "node-cron";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import {User} from "./models/user.model.js";



const app = express();
const httpServer = createServer(app); // socket.io ke liye
const io = new Server(httpServer, {
  cors: {
    origin: ["https://crm.nextsoftech.co", "http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  },
});

// Middlewares
app.use(express.urlencoded({ limit: "20kb", extended: true }));
app.use(express.json({ limit: "20kb" }));
app.use(
  cors({
    origin: ["https://crm.nextsoftech.co", "http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);
app.use(cookieParser());


const MessageSchema = new mongoose.Schema({
  from: String,
  to: String,
  body: String,
  status: String,
  dateSent: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", MessageSchema);

// Twilio creds
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const twimlAppSid = process.env.TWIML_APP_SID;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
  console.error("❌ Missing Twilio credentials in .env");
  process.exit(1);
}

// ✅ Socket.IO events
// io.on("connection", (socket) => {
//   console.log("🔗 New client connected:", socket.id);

//   socket.on("disconnect", () => {
//     console.log("❌ Client disconnected:", socket.id);
//   });
// });

io.on("connection", (socket) => {
  console.log("🔗 New client:", socket.id);

  socket.on("register_user", (userId) => {
    socket.join(userId.toString());
    console.log(`✅ User ${userId} registered to room`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});


// ✅ Call states
const activeCalls = {}; // { CallSid: { accepted: false } }

// 🔹 Token API
// app.get("/token", (req, res) => {
//   const AccessToken = twilio.jwt.AccessToken;
//   const VoiceGrant = AccessToken.VoiceGrant;
//   const identity = "support_agent";

//   const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, { identity });
//   token.addGrant(
//     new VoiceGrant({
//       outgoingApplicationSid: twimlAppSid,
//       incomingAllow: true,
//     })
//   );

//   res.json({ token: token.toJwt(), identity });
// });


app.get("/token/:userId", async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);

  if (!user) return res.status(404).json({ error: "User not found" });

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
    identity: user.phoneNumber,
  });

  token.addGrant(
    new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    })
  );

  res.json({ token: token.toJwt(), identity: user.phoneNumber });
});

// 📥 Get all conversations (unique numbers)
app.get("/conversations", async (req, res) => {
  try {
    const userNumber = process.env.TWILIO_PHONE // login user ka number (Twilio ka)
    
    const conversations = await Message.aggregate([
      {
        $project: {
          from: 1,
          to: 1,
          body: 1,
          status: 1,
          dateSent: 1,
          // counterparty number nikaal lo
          contact: {
            $cond: [{ $eq: ["$from", userNumber] }, "$to", "$from"]
          }
        }
      },
      {
        $group: {
          _id: "$contact",            // ab hamesha doosra banda
          lastMessage: { $last: "$$ROOT" }
        }
      },
      { $sort: { "lastMessage.dateSent": -1 } }
    ]);

    res.json({ success: true, data: conversations })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
});


// 📥 Get messages for specific number
// app.get("/messages/:phone", async (req, res) => {
//   const { phone } = req.params;
//   const msgs = await Message.find({
//     $or: [{ from: phone }, { to: phone }]
//   }).sort({ dateSent: 1 });

//   res.json(msgs);
// });


// 🔹 Incoming Call Webhook
// app.post("/incoming", (req, res) => {
//   const twiml = new twilio.twiml.VoiceResponse();
//   const callSid = req.body.CallSid;

//   if (!activeCalls[callSid]) {
//     activeCalls[callSid] = { accepted: false };
//   }

//   if (!activeCalls[callSid].accepted) {
//     const dial = twiml.dial({ answerOnBridge: true, timeout: 30 });
//     dial.client("support_agent");

//     // Notify all clients → new call
//     io.emit("incoming_call", { callSid });
//   } else {
//     twiml.reject();
//   }

//   res.type("text/xml");
//   res.send(twiml.toString());
// });



app.post("/incoming", async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const callSid = req.body.CallSid;
  const toNumber = req.body.To; // jis number par call aayi

  console.log(callSid, toNumber, "imcoming data")

  if (!activeCalls[callSid]) {
    activeCalls[callSid] = { accepted: false };
  }

  try {
    // DB se user find karo jiska number match kare
    const user = await User.findOne({ phoneNumber : toNumber });

    if (!user) {
      console.log("❌ No user assigned to this number:", toNumber);
      twiml.say("No agent is assigned to this number.");
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    if (!activeCalls[callSid].accepted) {
      const dial = twiml.dial({ answerOnBridge: true, timeout: 30 });

      // Yahan user ki identity dal do (frontend client connect hoga isi identity se)
      dial.client(user.phoneNumber);

      // Notify frontend → sirf us user ke socket ko
      io.to(user._id.toString()).emit("incoming_call", { callSid, toNumber });

    } else {
      twiml.reject();
    }
  } catch (err) {
    console.error("❌ Error in incoming:", err.message);
    twiml.say("Error processing the call.");
  }

  res.type("text/xml");
  res.send(twiml.toString());
});



// 🔹 Accept Call
app.post("/accept-call", (req, res) => {
  const { callSid } = req.body;

  if (!activeCalls[callSid]) {
    activeCalls[callSid] = { accepted: false };
  }

  if (activeCalls[callSid].accepted) {
    return res.status(400).json({ error: "Already accepted" });
  }

  activeCalls[callSid].accepted = true;

  // Broadcast → call accepted
  io.emit("call_accepted", { callSid });

  res.json({ status: "accepted", callSid });
});

// 🔹 End Call
app.post("/end-call", (req, res) => {
  const { callSid } = req.body;

  if (activeCalls[callSid]) {
    delete activeCalls[callSid];
  }

  // Broadcast → call ended
  io.emit("call_ended", { callSid });

  res.json({ status: "ended", callSid });
});

// 🔹 Outgoing Call
app.post("/voice", (req, res) => {
  const toNumber = req.body.To;
  const fromNumber = req.body.From;

  const twiml = new twilio.twiml.VoiceResponse();
  const dial = twiml.dial({
    callerId: fromNumber,
    answerOnBridge: true,
    timeout: 30,
  });

  if (toNumber) {
    dial.number(toNumber);
  } else {
    twiml.say("No destination provided.");
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

// 🔹 SMS Send
app.post("/sms", async (req, res) => {
  console.log("Full req.body received:", req.body);
  try {
    const { to, from, body } = req.body;
    console.log("to", to);

    const message = await client.messages.create({
      body,
      from, // Twilio number
      to,
    });

      const saved = await Message.create({
      from,
      to,
      body,
      status: message.status
    });
    res.json({ success: true, sid: message.sid });
  } catch (error) {
    console.error("❌ Error sending SMS:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/recived", async (req, res) => {
  const { From, To, Body } = req.body;

  const saved = await Message.create({
    from: From,
    to: To,
    body: Body,
    status: "received"
  });

  io.emit("new_message", saved); // push to frontend
});

app.get("/calls", async (req, res) => {
  try {
    const calls = await client.calls.list({ limit: 20 }); // last 20 calls
    res.json(calls);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 🔹 Messages List// Get messages for a specific number
app.get("/messages/:phoneNumber", async (req, res) => {
  try {
    const {phoneNumber} = req.params; // e.g. +1234567890

    const messages = await client.messages.list({
      to: phoneNumber,       // jis number par receive hue
       from: phoneNumber,  // agar is number se bheje gaye hain to isko use karo
    });

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});


// 🔹 Numbers List
app.get("/twilio/numbers", async (req, res) => {
  try {
    const numbers = await client.incomingPhoneNumbers.list();
    res.json({ success: true, numbers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔹 Recordings List
app.get("/recordings", async (req, res) => {
  const recordings = await client.recordings.list({ limit: 20 });
  res.json(recordings);
});

// 🔹 Call Logs with Lookup
// 🔹 Call Logs with Lookup (Enhanced)
app.get("/calls-with-lookup", async (req, res) => {
  try {
    const calls = await client.calls.list({ limit: 20 });

    const results = await Promise.all(
      calls.map(async (call) => {
        try {
          // Carrier lookup
          const info = await client.lookups.v2
            .phoneNumbers(call.to)
            .fetch();

          return {
            sid: call.sid,
            from: call.from,
            to: call.to,
            status: call.status,
            startTime: call.startTime,
            endTime: call.endTime,
            duration: call.duration,
            lineType: info.carrier?.type || "unknown", // landline / mobile
            carrier: info.carrier?.name || "unknown", // carrier name
          };
        } catch (err) {
          // If lookup fails, still return basic info
          return {
            sid: call.sid,
            from: call.from,
            to: call.to,
            status: call.status,
            startTime: call.startTime,
            endTime: call.endTime,
            duration: call.duration,
            lineType: "lookup_failed",
            carrier: "N/A",
          };
        }
      })
    );

    res.json({
      success: true,
      total: results.length,
      calls: results,
    });
  } catch (err) {
    console.error("❌ Error fetching calls with lookup:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔹 Test
app.get("/test", (req, res) => {
  console.log("Test API hit!");
  res.send("Test API running...");
});

// 🔹 Cron
cron.schedule("*/13 * * * *", () => {
  console.log("⏰ Cron job triggered after 13 minutes");
});

// Routes (example user routes)
import userRoute from "./routes/user.routes.js";
app.use("/user", userRoute);

// ✅ Export with socket server
export { httpServer as app };
