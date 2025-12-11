# Naye stable Node.js version ka istemal karein
FROM node:20-alpine

# Working directory set karna
WORKDIR /usr/src/app

# Dependencies file copy karna
COPY package.json ./

# Dependencies install karna
RUN npm install

# Baaki ke files copy karna
COPY . .

# Bot ko shuru karne ki command
CMD ["node", "index.js"]
