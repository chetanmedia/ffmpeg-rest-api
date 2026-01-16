# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3000

# Copy PM2 ecosystem config
COPY ecosystem.config.js ./

# Start both processes with PM2
CMD ["npx", "pm2-runtime", "start", "ecosystem.config.js"]
