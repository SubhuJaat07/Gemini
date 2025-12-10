require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

// --- KEEP ALIVE ---
const app = express();
const port = process.env.PORT || 8000;

app.get('/', (req, res) => res.send('Bot Running (Fixed API v1)'));
app.listen(port, () => console.log(`Server running on port ${port}`));

// --- DISCORD ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- GEMINI FIXED (v1) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelFlash = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
const modelPro = genAI.getGenerativeModel({ model: "gemini-1.5-pro-001" });;

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// --- MESSAGE HANDLER ---
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (process.env.AI_CHANNEL_ID && message.channel.id !== process.env.AI_CHANNEL_ID) return;

    await message.channel.sendTyping();

    try {
        // TRY FLASH FIRST
        const result = await modelFlash.generateContent({
            contents: [{ role: "user", parts: [{ text: message.content }] }]
        });

        const text = result.response.text();
        await sendSplit(message, text);
        return;

    } catch (e) {
        console.warn("Flash model failed → trying Pro...", e.message);
    }

    try {
        // TRY PRO MODEL
        const result = await modelPro.generateContent({
            contents: [{ role: "user", parts: [{ text: message.content }] }]
        });

        const text = result.response.text();
        await sendSplit(message, text);
        return;

    } catch (e) {
        console.error("Both models failed:", e.message);
        await message.reply("Server busy hai, thodi der baad try karna.");
    }
});

// --- SPLIT LONG MESSAGES ---
async function sendSplit(message, text) {
    if (text.length <= 2000) return message.reply(text);

    const chunks = text.match(/[\s\S]{1,1800}/g);
    for (const chunk of chunks) {
        await message.reply(chunk);
    }
}

client.login(process.env.DISCORD_TOKEN);
