import { Client, GatewayIntentBits } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import 'dotenv/config'; // Naya style dotenv load karne ka

// --- 1. WEB SERVER (Koyeb ke liye) ---
const app = express();
const port = process.env.PORT || 8000;

app.get('/', (req, res) => res.send('New GenAI Bot is Online!'));

app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
});

// --- 2. NEW AI SETUP ---
// Ye wo naya tarika hai jo screenshot me tha
if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR: API Key missing!");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

        // --- NEW SDK REQUEST ---
        // Nayi library me request bhejne ka tarika alag hai
        const { response } = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Jo tumne screenshot me dekha
            contents: [
                {
                    parts: [
                        { text: message.content }
                    ]
                }
            ]
        });
        // Response text nikalna. Check karein ki response available hai ya nahi
        const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text; 

        if (!text) {
            // Agar text nahi mila, to moderation ki warning bhejo
            await message.reply("Sorry, main is sawaal ka jawaab nahi de sakta (Content Policy ki wajah se).");
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
        console.error("New SDK Error:", error);
        
        // Fallback: Agar 2.5-flash abhi launch nahi hua hai, to user ko bata do
        if (error.message.includes('404') || error.message.includes('not found')) {
            await message.reply("Error: `gemini-2.5-flash` model abhi mere account par active nahi hai. Please code me `gemini-1.5-flash` karke try karein.");
        } else {
            await message.reply("Dimag kaam nahi kar raha (Error).");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
