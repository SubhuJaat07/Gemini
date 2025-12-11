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
// Note: The model name might need adjustment. Check available models at:
// https://ai.google.dev/gemini-api/docs/models/gemini

async function askGemini(prompt) {
  try {
    // CORRECT ENDPOINT - using 'generativelanguage.googleapis.com' not 'ai.google.dev'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;
    
    console.log(`Sending request to Gemini API with key: ${API_KEY ? 'Present' : 'Missing'}`);
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // NO Authorization header needed when using ?key= parameter
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    // Debug: Check what we're getting back
    const responseText = await res.text();
    console.log(`Response status: ${res.status}`);
    
    if (responseText.startsWith('<')) {
      console.error('Received HTML response (first 200 chars):', responseText.substring(0, 200));
      throw new Error('API returned HTML. Likely invalid endpoint or API key.');
    }

    const data = JSON.parse(responseText);
    console.log('Response structure:', Object.keys(data));
    
    // Extract response text safely
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    } else if (data.error) {
      console.error('API Error:', data.error);
      return `API Error: ${data.error.message || 'Unknown error'}`;
    } else {
      console.error('Unexpected response format:', data);
      return "Unexpected response format from Gemini.";
    }
    
  } catch (error) {
    console.error('Error in askGemini:', error.message);
    return `Error: ${error.message}`;
  }
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async msg => {
  if (msg.author.bot) return;
  if (msg.content.startsWith('!')) return; // Optional: ignore commands

  try {
    msg.channel.sendTyping();
    const reply = await askGemini(msg.content);
    
    // Discord has 2000 character limit per message
    if (reply.length > 2000) {
      const chunks = reply.match(/[\s\S]{1,1990}/g) || [];
      for (const chunk of chunks) {
        await msg.reply(chunk);
      }
    } else {
      await msg.reply(reply);
    }
  } catch (error) {
    console.error('Error processing message:', error);
    msg.reply("Sorry, I encountered an error processing your request.");
  }
});

client.login(process.env.DISCORD_TOKEN);
