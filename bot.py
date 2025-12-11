import os
import discord
from discord.ext import commands
from google import genai
from google.genai import types

# --- 1. SETUP ---
# Environment Variables se keys load karein
DISCORD_TOKEN = os.environ.get('DISCORD_TOKEN')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
AI_CHANNEL_ID = int(os.environ.get('AI_CHANNEL_ID', 0)) # Channel ID ko integer mein convert karein

# Discord Client setup (Message Content Intent zaruri hai)
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

# Gemini Client setup
try:
    ai_client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Gemini Client Initialization Error: {e}")
    ai_client = None

@bot.event
async def on_ready():
    """Bot ke online hone par run hota hai."""
    print(f'Logged in as {bot.user} (ID: {bot.user.id})')
    print('Bot is ready to receive commands.')

@bot.event
async def on_message(message):
    """Har message par run hota hai."""
    if message.author.bot:
        return
    
    # Check karein ki channel ID match ho raha hai
    if AI_CHANNEL_ID and message.channel.id != AI_CHANNEL_ID:
        return

    # Check karein ki Gemini client available hai
    if not ai_client:
        await message.reply("Maafi chahta hu, AI service abhi ready nahi hai. [Client Error]")
        return
    
    try:
        # User ko typing status dikhao
        async with message.channel.typing():
            
            # API Call (Stable model use karein)
            response = ai_client.models.generate_content(
                model='gemini-pro',
                contents=[message.content]
            )

            response_text = response.text
            
            if not response_text:
                # Content policy ya no text response
                await message.reply("Maafi chahta hu, is sawaal ka jawab content policy ki wajah se nahi de sakta.")
                return

            # Discord ki limit 2000 characters hai
            if len(response_text) > 2000:
                # Agar lamba ho to message ko split karein
                chunks = [response_text[i:i + 1990] for i in range(0, len(response_text), 1990)]
                for chunk in chunks:
                    await message.reply(chunk)
            else:
                await message.reply(response_text)

    except Exception as e:
        print(f"API Request Failed: {e}")
        await message.reply("Dimag kaam nahi kar raha (API ya Network Error).")

# Bot ko run karein
try:
    bot.run(DISCORD_TOKEN)
except discord.LoginFailure:
    print("Discord Login Failed: Invalid Token.")
except Exception as e:
    print(f"An unexpected error occurred during startup: {e}")
