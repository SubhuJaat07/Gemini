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

// ✅ CORRECT VARIABLE NAMES
const API_KEY = process.env.GEMINI_API_KEY;
const ALLOWED_CHANNEL_ID = process.env.AI_CHANNEL_ID; // Changed to AI_CHANNEL_ID

console.log("🔧 Environment Variables Status:");
console.log("1. GEMINI_API_KEY:", API_KEY ? `✅ Set (${API_KEY.substring(0,10)}...)` : "❌ NOT SET");
console.log("2. DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "✅ Set" : "❌ NOT SET");
console.log("3. AI_CHANNEL_ID:", ALLOWED_CHANNEL_ID ? `✅ Set (${ALLOWED_CHANNEL_ID})` : "❌ NOT SET - Bot will respond in ALL channels");

async function askGemini(prompt) {
  if (!API_KEY) {
    console.error("❌ GEMINI_API_KEY environment variable is not set!");
    return "❌ Error: API key not configured. Please set GEMINI_API_KEY in environment variables.";
  }
  
  try {
    console.log(`📤 Asking Gemini: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
    
    // Fix common typo in API key (Alza -> AIza)
    let actualKey = API_KEY;
    if (API_KEY.startsWith('Alza')) {
      console.warn("⚠️  Fixing API key typo: 'Alza' -> 'AIza'");
      actualKey = 'AIza' + API_KEY.substring(4);
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${actualKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const responseText = await response.text();
    console.log(`📥 Response status: ${response.status}`);
    
    if (response.status === 200) {
      const data = JSON.parse(responseText);
      
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const reply = data.candidates[0].content.parts[0].text;
        console.log(`✅ Gemini replied (${reply.length} chars)`);
        return reply;
      } else {
        console.error("❌ Unexpected response format:", data);
        return "❌ Unexpected response from Gemini API.";
      }
    } else {
      console.error("❌ API Error:", responseText.substring(0, 200));
      
      if (response.status === 401 || response.status === 403) {
        return "❌ API key is invalid or expired. Please check your GEMINI_API_KEY.";
      } else if (response.status === 429) {
        return "❌ Rate limit exceeded. Please try again later.";
      } else {
        return `❌ API Error (Status: ${response.status})`;
      }
    }
    
  } catch (error) {
    console.error("❌ Error in askGemini:", error.message);
    return `❌ Error: ${error.message}`;
  }
}

client.on("ready", () => {
  console.log(`\n✅ Bot is ready! Logged in as: ${client.user.tag}`);
  console.log(`🆔 Bot User ID: ${client.user.id}`);
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);
  
  // Test API connection on startup
  if (API_KEY) {
    console.log("\n🧪 Testing Gemini API connection...");
    askGemini("Say 'CONNECTED' in uppercase if you are working.")
      .then(response => {
        if (response.includes("CONNECTED")) {
          console.log("✅ Gemini API connection test: PASSED");
        } else {
          console.log("⚠️  Gemini API test got unexpected response");
        }
      })
      .catch(err => {
        console.log("❌ Gemini API connection test: FAILED -", err.message);
      });
  }
});

client.on("messageCreate", async msg => {
  // Ignore bot messages
  if (msg.author.bot) return;
  
  console.log(`\n📩 New message from ${msg.author.tag} in #${msg.channel.name}: "${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}"`);
  
  // ✅ Channel restriction
  if (ALLOWED_CHANNEL_ID && msg.channel.id !== ALLOWED_CHANNEL_ID) {
    console.log(`   ⏭️  Skipped - Not in allowed channel (Allowed: ${ALLOWED_CHANNEL_ID}, Current: ${msg.channel.id})`);
    return;
  } else {
    console.log(`   ✅ In allowed channel (${msg.channel.id})`);
  }
  
  // Help command
  if (msg.content === "!help" || msg.content === "!commands") {
    const helpText = `
**🤖 Bot Commands:**
\`!help\` - Show this help message
\`!status\` - Check bot status
\`!apikey\` - Check API key status
\`!channels\` - Show allowed channels
\`!test\` - Test the bot with a simple question

**💬 Normal Usage:**
Just type your message and I'll respond!
    `;
    return msg.reply(helpText);
  }
  
  // Status command
  if (msg.content === "!status") {
    const status = {
      "Bot": "✅ Online",
      "API Key": API_KEY ? "✅ Configured" : "❌ Missing",
      "Channel Restriction": ALLOWED_CHANNEL_ID ? "✅ Enabled" : "❌ Disabled",
      "Current Channel": msg.channel.name,
      "Uptime": `${process.uptime().toFixed(0)} seconds`
    };
    
    const statusText = Object.entries(status)
      .map(([key, value]) => `**${key}:** ${value}`)
      .join('\n');
    
    return msg.reply(statusText);
  }
  
  // API key status
  if (msg.content === "!apikey") {
    if (!API_KEY) {
      return msg.reply("❌ GEMINI_API_KEY is not set in environment variables!");
    }
    
    const keyInfo = {
      "Status": "✅ Set",
      "First 10 chars": API_KEY.substring(0, 10) + "...",
      "Length": `${API_KEY.length} characters`,
      "Format": API_KEY.startsWith('AIza') ? "✅ Correct" : "⚠️  Might have typo"
    };
    
    const keyText = Object.entries(keyInfo)
      .map(([key, value]) => `**${key}:** ${value}`)
      .join('\n');
    
    return msg.reply(keyText);
  }
  
  // Channel info
  if (msg.content === "!channels") {
    if (ALLOWED_CHANNEL_ID) {
      return msg.reply(`✅ Bot will only respond in channel ID: \`${ALLOWED_CHANNEL_ID}\`\nCurrent channel ID: \`${msg.channel.id}\``);
    } else {
      return msg.reply("⚠️  Channel restriction is disabled. Bot will respond in ALL channels.");
    }
  }
  
  // Test command
  if (msg.content === "!test") {
    msg.channel.sendTyping();
    const testResponse = await askGemini("What is 2+2? Answer in one word only.");
    return msg.reply(`Test Result: ${testResponse}`);
  }
  
  // Normal message processing
  try {
    msg.channel.sendTyping();
    console.log(`   💭 Processing with Gemini...`);
    
    const startTime = Date.now();
    const reply = await askGemini(msg.content);
    const processingTime = Date.now() - startTime;
    
    console.log(`   ✅ Got response in ${processingTime}ms`);
    
    // Discord character limit handling
    if (reply.length > 2000) {
      const chunks = reply.match(/[\s\S]{1,1990}/g) || [];
      console.log(`   📦 Splitting into ${chunks.length} parts`);
      
      for (let i = 0; i < chunks.length; i++) {
        await msg.reply(`**(Part ${i+1}/${chunks.length})**\n${chunks[i]}`);
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Delay between chunks
        }
      }
    } else {
      await msg.reply(reply);
    }
    
  } catch (error) {
    console.error("❌ Message processing error:", error);
    msg.reply("❌ Sorry, an error occurred while processing your message. Please try again.");
  }
});

// Error handling
client.on("error", error => {
  console.error("❌ Discord client error:", error);
});

client.on("warn", warning => {
  console.warn("⚠️  Discord warning:", warning);
});

client.login(process.env.DISCORD_TOKEN);
