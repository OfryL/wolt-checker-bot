FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create database directory
RUN mkdir -p ./db

# Expose port (optional, in case you want to add health checks later)
EXPOSE 3000

# Default command to run the main bot
CMD ["npm", "start"]
