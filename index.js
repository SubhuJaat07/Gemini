import { Client, GatewayIntentBits } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import 'dotenv/config'; 

// --- 1. WEB SERVER (KOYEB HEALTH CHECK) ---
const app = express();
const port = process.env.PORT || 8000;

app.get('/', (req, res) => res.send('New GenAI Bot is Online!'));

app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
});

// --- 2. AI SETUP ---
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

        // --- GEMINI API CALL ---
        const { response } = await ai.models.generateContent({
            model: 'gemini-pro', // SAFE & STABLE MODEL FINALIZED
            contents: [
                {
                    parts: [
                        { text: message.content }
                    ]
                }
            ]
        });

        // Response text nikalna aur Safety check karna
        const text = response.text; 
        
        // Final check: Agar text nahi mila (Content Moderation se roka gaya)
        if (!text) {
            console.warn("AI ne reply nahi diya. Safety/Moderation check.");
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
        console.error("Final API Error:", error);
        // Is level par, agar koi error aata hai to woh General API ya Network ka hoga
        await message.reply("Dimag kaam nahi kar raha (Network ya General API Error).");
    }
});

client.login(process.env.DISCORD_TOKEN);
