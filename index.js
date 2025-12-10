require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

// --- 1. SERVER KEEP-ALIVE ---
const app = express();
const port = process.env.PORT || 8000;

app.get('/', (req, res) => res.send('Bot is Online with Fallback System!'));

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// --- 2. DISCORD CONFIG ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- 3. GEMINI MODELS SETUP ---
if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR: API Key nahi mili!");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Yahan hum dono models define kar rahe hain
const modelFlash = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Primary (Fast)
const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });         // Backup (Stable)

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (process.env.AI_CHANNEL_ID && message.channel.id !== process.env.AI_CHANNEL_ID) return;

    // User ko dikhao ki bot soch raha hai
    await message.channel.sendTyping();

    try {
        // STEP 1: Pehle Flash Model try karo
        const result = await modelFlash.generateContent(message.content);
        const response = await result.response;
        await sendSplitMessage(message, response.text());

    } catch (errorFlash) {
        console.warn("Flash Model Fail hua, Pro Model try kar raha hu...", errorFlash.message);

        try {
            // STEP 2: Agar Flash fail hua, to Pro Model try karo (Backup)
            const result = await modelPro.generateContent(message.content);
            const response = await result.response;
            await sendSplitMessage(message, response.text());

        } catch (errorPro) {
            // STEP 3: Agar dono fail ho gaye
            console.error("Dono Models Fail ho gaye:", errorPro);
            await message.reply("Sorry, abhi Google ke saare servers busy hain. Thodi der baad try karna.");
        }
    }
});

// Helper Function: Lambe messages ko tod kar bhejne ke liye
async function sendSplitMessage(message, text) {
    if (text.length > 2000) {
        const chunks = text.match(/[\s\S]{1,1900}/g) || [];
        for (const chunk of chunks) {
            await message.reply(chunk);
        }
    } else {
        await message.reply(text);
    }
}

client.login(process.env.DISCORD_TOKEN);
