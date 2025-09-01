  import express from "express";
  import twilio from "twilio";

  const app = express();
  const PORT = 3000;

  // Twilio creds
  const accountSid = "AC8bb6c7b29ad42fb9136d126149b2835a";
  const authToken = "191c2ea6315a5d2e27b7acec739d22ed";
  const client = twilio(accountSid, authToken);

async function sendSms(to, body) {
  try {
    const message = await client.messages.create({
      body,                   // SMS ka text
      from: "+15712225253",   // Twilio purchased number
      to,                     // Receiver ka number
    });

    console.log("SMS sent:", message);
  } catch (error) {
    console.error("SMS error:", error);
  }
}

  sendSms("+19019611608", "Hello Bhai! Ye SMS Twilio se aya hai please w.app per update kardo ye aya ya nh");
