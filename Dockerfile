# Use the official Node.js 22 image (Puppeteer 23+ requires Node 22+)
FROM node:22-slim

# Install system dependencies for Chrome and PDF generation
# Adding 'tar' and 'ca-certificates' to fix extraction and SSL issues
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates tar \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Prevent Puppeteer from downloading its own Chromium (we use the system one)
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Expose the port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
