# Base image Python ka use karein
FROM python:3.11-alpine

# Working directory set karna
WORKDIR /usr/src/app

# Dependencies file copy karna
COPY requirements.txt ./

# Dependencies install karna
RUN pip install --no-cache-dir -r requirements.txt

# Baaki ke files copy karna
COPY . .

# Bot ko shuru karne ki command
CMD ["python", "bot.py"]
