import { Client, GatewayIntentBits } from 'discord.js';
// Tumhara verified import
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import 'dotenv/config'; 

// --- 1. WEB SERVER (KOYEB HEALTH CHECK) ---
const app = express();
const port = process.env.PORT || 8000;

app.get('/', (req, res) => res.send('Canonical Bot Active!'));
app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
});

// --- 2. AI SETUP (Verified Snippet) ---
// Key automatically GEMINI_API_KEY se uthegi
const ai = new GoogleGenAI({}); 

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

        // --- GEMINI API CALL (Verified Model and Syntax) ---
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: message.content
        });

        // Response Handling
        const text = response.text;
        
        // Final check: Agar text nahi mila (Content Moderation ya API issue)
        if (!text) {
            await message.reply("Maaf karna, is sawaal ka jawab nahi de sakta (Safety Block).");
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
        console.error("Final CRITICAL API Error:", error);
        // Agar yahan error aaya, toh iska matlab hai ki tumhari API Key ko Google ne project level par block kiya hai.
        await message.reply("Dimag kaam nahi kar raha. (Error Code: Key/Project Lock)");
    }
});

client.login(process.env.DISCORD_TOKEN);
