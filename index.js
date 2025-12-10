require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

// --- 1. WEB SERVER (Koyeb ko khush rakhne ke liye) ---
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Gemini Bot is Active and Running!');
});

app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
});

// --- 2. BOT SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Gemini Config
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// --- 3. MESSAGE LOGIC ---
client.on('messageCreate', async (message) => {
    // Khud ko reply na kare
    if (message.author.bot) return;

    // Check kare ki kya ye sahi channel hai?
    // Environment variable se channel ID lega
    if (message.channel.id !== process.env.AI_CHANNEL_ID) return;

    try {
        // Typing dikhaye
        await message.channel.sendTyping();

        // Gemini se answer le
        const result = await model.generateContent(message.content);
        const response = await result.response;
        const text = response.text();

        // Agar message 2000 characters se bada hai to tod kar bheje
        if (text.length > 2000) {
            const chunks = text.match(/[\s\S]{1,1900}/g) || [];
            for (const chunk of chunks) {
                await message.reply(chunk);
            }
        } else {
            await message.reply(text);
        }

    } catch (error) {
        console.error('Error:', error);
        await message.reply('Mera dimag abhi kaam nahi kar raha (API Error).');
    }
});

// Login
client.login(process.env.DISCORD_TOKEN);
