# Base image: Latest standard Node.js
FROM node:20-alpine

# Working directory set karna
WORKDIR /usr/src/app

# Dependencies file copy karna
COPY package.json ./

# Dependencies install karna (Is baar cache se nahi uthega)
RUN npm install

# Baaki ke files copy karna
COPY . .

# Bot ko shuru karne ki command
CMD ["node", "index.js"]
