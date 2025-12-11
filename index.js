import { Client, GatewayIntentBits } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Stable Library
import express from 'express';
import 'dotenv/config'; 

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
// Stable SDK Initialization
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

        // --- GEMINI API CALL (Stable V1.5 Flash) ---
        // Stable SDK mein seedha generateContent call hota hai
        const result = await ai.generateContent({
            model: 'gemini-1.5-flash', // Most successful model name
            contents: [{ role: "user", parts: [{ text: message.content }] }],
        });

        // Response Handling
        const text = result.text; // Stable SDK mein .text property use hoti hai
        
        if (!text) {
            console.warn("AI ne reply nahi diya. Safety/Moderation check.");
            await message.reply("Sorry, main is sawaal ka jawaab nahi de sakta.");
            return;
        }

        // Split Logic
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
        await message.reply("Final Error: Stable model bhi fail ho gaya. Kripya naya API Key generate karein."); 
    }
});

client.login(process.env.DISCORD_TOKEN);
