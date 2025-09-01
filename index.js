// // Download the helper library from https://www.twilio.com/docs/node/install
// const twilio = require("twilio"); // Or, for ESM: import twilio from "twilio";

// // Find your Account SID and Auth Token at twilio.com/console
// // and set the environment variables. See http://twil.io/secure
// const accountSid = 'AC8bb6c7b29ad42fb9136d126149b2835a';
// const authToken = '191c2ea6315a5d2e27b7acec739d22ed';

// async function createCall() {

//   const call = await client.calls.create({
//     from: "+15712225253",
//     to: "+923130039150",
//     url: "http://demo.twilio.com/docs/voice.xml",
//   });

//   console.log(call.sid);
// }

// createCall();

// async function getNumbers() {
//   const numbers = await client.incomingPhoneNumbers.list();
//   numbers.forEach(num => console.log(num.phoneNumber));
// }

// getNumbers();

// import express from "express";

// const app = express();
// const PORT = 3000;

// app.use(express.urlencoded({ extended: false }));

// // Example Voice webhook
// app.post("/voice", (req, res) => {
//   const twiml = new client.twiml.VoiceResponse();

//   // yahan pe hum doosra number dial karwa rahe hain
//   twiml.dial("+923001112222");

//   res.type("text/xml");
//   res.send(twiml.toString());
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
// });

  // import express from "express";
  // import twilio from "twilio";

  // const app = express();
  // const PORT = 3000;

  // // Twilio creds
  // const accountSid = "AC8bb6c7b29ad42fb9136d126149b2835a";
  // const client = twilio(accountSid, authToken);

  // // Webhook endpoint (TwiML response)
  // app.post("/voice", (req, res) => {
  //   const twiml = new twilio.twiml.VoiceResponse();

  //   // Dial the second user
  //   twiml.dial("+923130039150"); // ← yahan doosra user ka number do

  //   res.type("text/xml");
  //   res.send(twiml.toString());
  // });

  // // Function to start the call
  // async function startCall() {
  //   const call = await client.calls.create({
  //     from: "+15712225253",     // Twilio verified/purchased number
  //     to: "+923130039150",      // Pehle user ka number
  //     url: "https://76a4440a9474.ngrok-free.app/voice", // Ye tumhara webhook host hoga
  //   });

  //   console.log("Call started:", call.sid);
  // }

  // startCall();

  // app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  // server.js
// server.js
// demo-server.js
// import express from "express";
// import twilio from "twilio";
// import bodyParser from "body-parser";
// import dotenv from "dotenv";
// import cors from 'cors'
//
// dotenv.config();
// const app = express();
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(cors({
//   origin : 'http://127.0.0.1:5500'
// }))
//
// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const apiKeySid = process.env.TWILIO_API_KEY_SID;
// const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
// const twimlAppSid = process.env.TWIML_APP_SID;
// const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
//
// app.get("/token", (req, res) => {
//   const AccessToken = twilio.jwt.AccessToken;
//   const VoiceGrant = AccessToken.VoiceGrant;
//
//   const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
//     identity: "demo-user",
//   });
//
//   token.addGrant(
//     new VoiceGrant({
//       outgoingApplicationSid: twimlAppSid,
//       incomingAllow: true,
//     })
//   );
//
//   res.json({ token: token.toJwt() });
// });
//
// app.post("/voice", (req, res) => {
//   const twiml = new twilio.twiml.VoiceResponse();
//   const dial = twiml.dial({ callerId: phoneNumber });
//
//   if (req.body.To) {
//     if (/^\+?\d+$/.test(req.body.To)) {
//       dial.number(req.body.To);
//     } else {
//       dial.client(req.body.To);
//     }
//   } else {
//     twiml.say("Hello, this is demo working!");
//   }
//
//   res.type("text/xml");
//   res.send(twiml.toString());
// });
//
// app.listen(3000, () => console.log("Demo server running on port 3000"));


import express from "express";
import twilio from "twilio";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import cron from "node-cron";
import axios from "axios";




dotenv.config();
const app = express();
app.use(express.urlencoded({ extended: true}));
app.use(express.json({limit : '50kb'}));
app.use(cors({
  origin: 'http://localhost:3001',
}));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const twimlAppSid = process.env.TWIML_APP_SID;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);


console.log(phoneNumber);

if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid || !phoneNumber) {
  console.error("Missing Twilio credentials in .env");
  process.exit(1);
}

app.get("/token", (req, res) => {
  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

    const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, { identity: "support_agent" });
  token.addGrant(
      new VoiceGrant({
        outgoingApplicationSid: twimlAppSid,
        incomingAllow: true,
      })
  );

  res.json({ token: token.toJwt() });
});


app.post('/incoming', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const dial = twiml.dial();
  dial.client("support_agent");  // <-- yahan client ka naam
  res.type("text/xml");
  res.send(twiml.toString());
})
app.post("/voice", (req, res) => {
  const toNumber = req.body.To;
  const fromNumber = req.body.From;

  console.log('Full req.body received:', req.body);  // Debug: Log everything
  console.log('To value:', req.body.To);  // Specific log for To

  const twiml = new twilio.twiml.VoiceResponse();
  const dial = twiml.dial({ callerId: fromNumber
  });

  if (toNumber) {  // Stricter check for non-empty
    if (true) {
      dial.number(toNumber);
    } else {
      dial.client(toNumber);
    }
  } else {
    console.error('To is empty or missing!');  // Log error
    twiml.say("No destination provided. Please specify a number or client.");
  }

  res.type("text/xml");
  res.send(twiml.toString());
});
app.get("/calls", async (req, res) => {
  try {
    const calls = await client.calls.list({ limit: 20 }); // last 20 calls
    res.json(calls);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ✅ Get single call detail by Call SID
app.get("/calls/:sid", async (req, res) => {
  try {
    const call = await client.calls(req.params.sid).fetch();
    res.json(call);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
// ✅ Message Receive Webhook
app.post("/sms", async (req, res) => {
  console.log('Full req.body received:', req.body);
  try {
    const { to, from, body } = req.body;
    console.log('to', to);


    const message = await client.messages.create({
      body,
      from, // Twilio number
      to
    })
    res.json({ success: true, sid: message.sid });
  } catch (error) {
    console.error("❌ Error sending SMS:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Message Logs API
app.get("/messages", async (req, res) => {
  try {
    const messages = await client.messages.list({ limit: 20 });
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).send(err.message);
  }
});

app.get("/recordings", async (req, res) => {
  try {
    const recordings = await client.recordings.list({ limit: 20 });
    res.json(recordings);
  } catch (err) {
    console.error("Error fetching recordings:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ 2. Get single recording by SID
app.get("/recordings/:sid", async (req, res) => {
  try {
    const recording = await client.recordings(req.params.sid).fetch();
    res.json(recording);
  } catch (err) {
    console.error("Error fetching recording:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Demo server running on port 3000"));