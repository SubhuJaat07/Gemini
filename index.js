import { Client, GatewayIntentBits } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai'; // CORRECT IMPORT
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
    console.error("ERROR: GEMINI_API_KEY missing!");
    process.exit(1); // Exit if no API key
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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
    console.log(`AI Channel: ${process.env.AI_CHANNEL_ID || 'ALL CHANNELS'}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (process.env.AI_CHANNEL_ID && message.channel.id !== process.env.AI_CHANNEL_ID) return;

    try {
        await message.channel.sendTyping();

        // --- GEMINI API CALL (CORRECT METHOD) ---
        const result = await model.generateContent(message.content);
        const response = await result.response;
        const text = response.text();
        
        // Final check: Agar text nahi mila (Content Moderation se roka gaya)
        if (!text || text.trim() === '') {
            console.warn("AI ne reply nahi diya. Safety/Moderation check.");
            await message.reply("Sorry, main is sawaal ka jawaab nahi de sakta (Content Policy ki wajah se).");
            return;
        }

        // Discord character limit (2000 characters, not words)
        if (text.length > 2000) {
            // Split by characters with overlap
            const chunks = [];
            for (let i = 0; i < text.length; i += 1900) {
                chunks.push(text.substring(i, i + 1900));
            }
            
            // Send first chunk as reply
            await message.reply(chunks[0]);
            
            // Send remaining chunks as follow-ups
            for (let i = 1; i < chunks.length; i++) {
                await message.channel.send(chunks[i]);
            }
        } else {
            await message.reply(text);
        }

    } catch (error) {
        console.error("API Error Details:", error);
        
        // Better error messages based on error type
        if (error.message?.includes('API key')) {
            await message.reply("API key issue. Please check GEMINI_API_KEY.");
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
            await message.reply("Network error. Please try again.");
        } else if (error.message?.includes('safety')) {
            await message.reply("Content blocked by safety filters.");
        } else {
            await message.reply(`Error: ${error.message?.substring(0, 100)}...`);
        }
    }
});

// Login with error handling
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('Discord Login Error:', error);
    process.exit(1);
});
