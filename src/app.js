import express from "express";
import cors from 'cors'
import cookieParser from 'cookie-parser'
import twilio from "twilio";
import cron from "node-cron";

const app = express()
app.use(express.urlencoded({limit : '20kb', extended : true}))
app.use(express.json({limit:'20kb'}))
app.use(cors({
    origin : ['https://crm.nextsoftech.co', 'http://localhost:3000', 'http://localhost:3001'],
    credentials : true
}))
app.use(cookieParser())

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const twimlAppSid = process.env.TWIML_APP_SID;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);
console.log(twimlAppSid)


console.log(phoneNumber);

if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid ) {
  console.error("Missing Twilio credentials in .env");
  process.exit(1);
}

app.get("/token", (req, res) => {
  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;
  const identity = 'support_agent'
    const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, { identity : identity });
  token.addGrant(
      new VoiceGrant({
        outgoingApplicationSid: twimlAppSid,
        incomingAllow: true,
      })
  );

  res.json({ token: token.toJwt(), identity});
});


app.post('/incoming', (req, res) => {
 const twiml = new twilio.twiml.VoiceResponse();
  const dial = twiml.dial({ answerOnBridge: true, timeout: 30 });
  dial.client("support_agent");  // jis pe modal open karna hai
  res.type("text/xml");
  res.send(twiml.toString());
})
app.post("/voice", (req, res) => {
  const toNumber = req.body.To;
  const fromNumber = req.body.From;

  console.log('Full req.body received:', req.body);  // Debug: Log everything
  console.log('To value:', req.body.To);  // Specific log for To

  const twiml = new twilio.twiml.VoiceResponse();
  const dial = twiml.dial({ callerId: fromNumber,
    answerOnBridge: true,  // call tab tak connected rahega jab tak dusra pickup kare
    timeout: 30
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

app.get("/test", (req, res) => {
  console.log("Test API hit!");
  res.send("Test API running...");
});

// Cron job (har 13 min baad chale)
cron.schedule("*/13 * * * *", () => {
  console.log("Cron job triggered after 13 minutes");
  // yahan par API call karwa sakte ho (axios ya fetch se)
});
// routes

import userRoute from './routes/user.routes.js'

app.use('/user',  userRoute)

export {app}
