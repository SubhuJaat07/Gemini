# Base image for Node.js
FROM node:20-alpine

# Working directory set karna
WORKDIR /usr/src/app

# package.json aur package-lock.json ko copy karna
COPY package*.json ./

# Dependencies install karna
RUN npm install

# Baaki ke files copy karna
COPY . .

# Environment variable set karna
ENV NODE_ENV production

# Bot ko shuru karne ki command
CMD [ "npm", "start" ]
