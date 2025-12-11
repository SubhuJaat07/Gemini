// Standard Node.js CommonJS imports
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

// --- 1. WEB SERVER (KOYEB HEALTH CHECK) ---
const app = express();
const port = process.env.PORT || 8000;

app.get('/', (req, res) => res.send('Stable Bot is Online!'));
app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
});

// --- 2. AI SETUP ---
if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR: API Key missing!");
}
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 3. DISCORD SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (process.env.AI_CHANNEL_ID && message.channel.id !== process.env.AI_CHANNEL_ID) return;

    try {
        await message.channel.sendTyping();

        // --- GEMINI API CALL: Using the Universal Model ---
        const response = await ai.getGenerativeModel({ model: 'gemini-pro' }).generateContent(message.content);

        // --- RESPONSE HANDLING FIX (Against TypeError) ---
        // Stable SDK mein response.text() function hota hai
        const text = response.text;
        
        // Final check: Agar text nahi mila (Content Moderation ya API issue)
        if (!text) {
            console.warn("AI ne reply nahi diya.");
            await message.reply("Maaf karna, main is sawaal ka jawaab nahi de sakta.");
            return;
        }

        // Split Logic (2000 words limit)
        if (text.length > 2000) {
            const chunks = text.match(/[\s\S]{1,1900}/g) || [];
            for (const chunk of chunks) {
                await message.reply(chunk);
            }
        } else {
            await message.reply(text);
        }

    } catch (error) {
        console.error("Final API Error:", error);
        await message.reply("Dimag kaam nahi kar raha (General API Error). Kripya naya API Key generate karein.");
    }
});

client.login(process.env.DISCORD_TOKEN);
