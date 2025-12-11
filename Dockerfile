# Use Node.js LTS version
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy app source
COPY . .

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S discordbot -u 1001

# Change ownership
RUN chown -R discordbot:nodejs /usr/src/app
USER discordbot

# Health check for Koyeb
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:${PORT:-8000}').then(r=>process.exit(r.ok?0:1)).catch(e=>process.exit(1))"

# Expose port (Koyeb automatically maps this)
EXPOSE 8000

# Start the application
CMD ["npm", "start"]
