import express from "express";
const app = express();
const PORT = process.env.PORT || 8000;

app.get("/", (req, res) => {
  res.send("Bot Running OK");
});

app.listen(PORT, () => {
  console.log("Web server running on port " + PORT);
});
import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const API_KEY = process.env.GOOGLE_API_KEY;
const MODEL = "gemini-2.5-flash";   // EXACT same model Zapier uses

async function askGemini(prompt) {
  const res = await fetch(
    `https://ai.google.dev/v1/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      })
    }
  );

  const data = await res.json();
  try {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
  } catch {
    return "Error parsing Gemini response.";
  }
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async msg => {
  if (msg.author.bot) return;

  msg.channel.sendTyping();
  const reply = await askGemini(msg.content);
  msg.reply(reply);
});

client.login(process.env.DISCORD_TOKEN);
