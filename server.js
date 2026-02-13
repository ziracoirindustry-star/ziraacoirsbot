const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const VERIFY_TOKEN = "ziraacoirs123";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


/* ================================
   ROOT ROUTE (Health Check)
================================ */
app.get("/", (req, res) => {
  res.status(200).send("Ziraa Coir WhatsApp Bot is running ✅");
});


/* ================================
   WEBHOOK VERIFICATION
================================ */
app.get(["/webhook", "/webhook/"], (req, res) => {
  console.log("Webhook GET hit");

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully");
    return res.status(200).send(challenge);
  }

  return res.status(200).send("Webhook endpoint active");
});


/* ================================
   RECEIVE WHATSAPP MESSAGES
================================ */
app.post(["/webhook", "/webhook/"], async (req, res) => {
  try {
    console.log("Webhook POST received");
    console.log("Incoming Body:", JSON.stringify(req.body, null, 2));

    const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!msg) {
      console.log("No message found in webhook");
      return res.sendStatus(200);
    }

    const from = msg.from;
    const text = msg.text?.body;

    if (!text) {
      console.log("Message has no text body");
      return res.sendStatus(200);
    }

    console.log("Incoming message:", text);

    /* ================================
       CALL OPENAI
    ================================= */
    const aiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: text }],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply = aiResponse.data.choices[0].message.content;

    console.log("AI Reply:", reply);

    /* ================================
       SEND REPLY TO WHATSAPP
    ================================= */
    await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Reply sent to WhatsApp successfully");

    return res.sendStatus(200);

  } catch (error) {
    console.log("ERROR:", error.response?.data || error.message);
    return res.sendStatus(200);
  }
});


/* ================================
   START SERVER
================================ */
app.listen(PORT, () => {
  console.log(`Ziraa Coir Bot running on port ${PORT}`);
});
