import { Client, GatewayIntentBits } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import express from 'express';
import 'dotenv/config';

// --- 1. WEB SERVER (KOYEB HEALTH CHECK) ---
const app = express();
const port = process.env.PORT || 8000;

// Health check endpoint for Koyeb
app.get('/', (req, res) => res.json({ 
  status: 'online', 
  service: 'Discord Gemini Bot',
  timestamp: new Date().toISOString()
}));

app.get('/health', (req, res) => res.status(200).send('OK'));

app.listen(port, () => {
  console.log(`✅ Web server running on port ${port}`);
});

// --- 2. AI SETUP ---
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY missing in environment variables!");
  console.log("ℹ️  Koyeb me Environment Variables set karein:");
  console.log("   1. GEMINI_API_KEY");
  console.log("   2. DISCORD_TOKEN");
  console.log("   3. AI_CHANNEL_ID (optional)");
  process.exit(1);
}

if (!process.env.DISCORD_TOKEN) {
  console.error("❌ ERROR: DISCORD_TOKEN missing!");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    topK: 1,
    topP: 1,
    maxOutputTokens: 1000,
  }
});

// --- 3. DISCORD SETUP ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  presence: {
    activities: [{
      name: 'Gemini AI',
      type: 3 // WATCHING
    }],
    status: 'online'
  }
});

// Error handling
client.on('error', console.error);
client.on('warn', console.warn);

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`🤖 AI Channel: ${process.env.AI_CHANNEL_ID ? `#${process.env.AI_CHANNEL_ID}` : 'ALL CHANNELS'}`);
  console.log(`👥 Serving ${client.guilds.cache.size} servers`);
});

// Rate limit handling
const userCooldown = new Map();
const COOLDOWN_TIME = 3000; // 3 seconds per user

client.on('messageCreate', async (message) => {
  // Basic checks
  if (message.author.bot) return;
  if (!message.guild) return; // DM ignore
  
  // Channel restriction check
  if (process.env.AI_CHANNEL_ID && message.channel.id !== process.env.AI_CHANNEL_ID) return;
  
  // Cooldown check
  const now = Date.now();
  const lastRequest = userCooldown.get(message.author.id);
  if (lastRequest && (now - lastRequest) < COOLDOWN_TIME) {
    const timeLeft = Math.ceil((COOLDOWN_TIME - (now - lastRequest)) / 1000);
    return message.react('⏳').catch(() => {});
  }
  
  userCooldown.set(message.author.id, now);

  try {
    await message.channel.sendTyping();

    // Gemini API call with timeout
    const result = await Promise.race([
      model.generateContent(message.content),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI response timeout (10s)')), 10000)
      )
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    if (!text || text.trim() === '') {
      await message.reply('🤖 AI couldn\'t generate a response (safety filters).');
      return;
    }

    // Send response (with chunking for long messages)
    const maxLength = 1900;
    if (text.length <= maxLength) {
      await message.reply(text);
    } else {
      const chunks = [];
      for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.substring(i, i + maxLength));
      }
      
      // Send first as reply, rest as follow-ups
      await message.reply(chunks[0]);
      for (let i = 1; i < chunks.length; i++) {
        await message.channel.send(chunks[i]);
      }
    }
    
    // Success reaction
    await message.react('✅').catch(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    
    // Clean error message
    let errorMessage = 'Oops! Something went wrong.';
    if (error.message.includes('API key')) {
      errorMessage = 'API key issue. Please check configuration.';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = 'Network error. Please try again.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'AI is taking too long to respond.';
    }
    
    await message.reply(`🤖 ${errorMessage}`).catch(() => {});
    await message.react('❌').catch(() => {});
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  client.destroy();
  process.exit(0);
});

// Login
client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('❌ Discord Login Failed:', error.message);
  process.exit(1);
});
