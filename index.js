// Standard Node.js CommonJS imports
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

// FALLBACK CHAIN: Yeh models isi order mein try honge
const FALLBACK_MODELS = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-pro',
    'gemini-1.0-pro' 
];

// --- 1. WEB SERVER (KOYEB HEALTH CHECK) ---
const app = express();
const port = process.env.PORT || 8000;

app.get('/', (req, res) => res.send('Full Fallback Bot Active!'));
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

    let successfulResponse = null;
    let lastError = null;

    try {
        await message.channel.sendTyping();

        // --- FALLBACK LOGIC ---
        for (const modelName of FALLBACK_MODELS) {
            try {
                await message.channel.sendTyping(); // Keep typing indicator active
                
                // Log which model is being tried
                console.log(`Attempting model: ${modelName}`);

                const response = await ai.getGenerativeModel({ model: modelName }).generateContent(message.content);
                
                // Agar response mil gaya to loop se bahar niklo
                successfulResponse = response;
                await message.reply(`✅ Model Used: ${modelName}`); // Batao ki konsa model chala

                break; 
            } catch (error) {
                lastError = error;
                console.warn(`Model ${modelName} failed. Error: ${error.message || error.statusText}`);
                // Agar 404 (Not Found) ya 503 (Overloaded) aaya to agla model try karo
                if (error.status === 404 || error.status === 503 || error.message.includes('not valid')) {
                     continue;
                }
                // Agar koi bada/general error aaya to poora process rok do
                break; 
            }
        }

        // --- RESPONSE PROCESSING ---
        if (successfulResponse) {
            const text = successfulResponse.text;
            
            if (!text) {
                await message.reply("Maaf karna, is sawaal ka jawaab nahi de sakta (Safety/Content Block).");
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

        } else {
            // Agar saare models fail ho gaye
            console.error("All models failed. Last error:", lastError);
            await message.reply(`❌ Dimag kaam nahi kar raha. Sabhi models fail ho gaye. (Last Error: ${lastError.statusText || lastError.message})`);
        }
    } catch (error) {
        console.error("Final UNHANDLED Error:", error);
        await message.reply("Dimag kaam nahi kar raha. Ek anjana error aaya.");
    }
});

client.login(process.env.DISCORD_TOKEN);
