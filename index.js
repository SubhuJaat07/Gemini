require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

// --- 1. KOYEB HEALTH CHECK SERVER ---
const app = express();
// Koyeb automatically sets PORT, usually to 8000
const port = process.env.PORT || 8000;

app.get('/', (req, res) => {
    res.send('Gemini Bot is Online!');
});

app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
});

// --- 2. DISCORD BOT SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- 3. GEMINI SETUP ---
// Ensure API Key exists
if (!process.env.GEMINI_API_KEY) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is missing in Environment Variables!");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Ab naye package.json ke sath ye model chal jayega
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

client.once('ready', () => {
    console.log(`Bot Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    // 1. Ignore bots
    if (message.author.bot) return;

    // 2. Channel Lock (Agar Environment Variable set hai to sirf wahi kaam karega)
    if (process.env.AI_CHANNEL_ID && message.channel.id !== process.env.AI_CHANNEL_ID) {
        return;
    }

    try {
        await message.channel.sendTyping();

        // 3. Generate Content
        const result = await model.generateContent(message.content);
        const response = await result.response;
        const text = response.text();

        // 4. Split Long Messages (Discord 2000 char limit)
        if (text.length > 2000) {
            const chunks = text.match(/[\s\S]{1,1900}/g) || [];
            for (const chunk of chunks) {
                await message.reply(chunk);
            }
        } else {
            await message.reply(text);
        }

    } catch (error) {
        console.error('Gemini Error:', error);
        // Error user ko batana optional hai, taaki spam na ho
        // await message.reply("Error connecting to AI."); 
    }
});

client.login(process.env.DISCORD_TOKEN);
