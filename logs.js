import express from "express";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();
const app = express();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// ✅ Get all call logs
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

app.listen(3000, () => console.log("Server running on port 3000"));
