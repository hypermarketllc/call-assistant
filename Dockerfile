FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Build the frontend
RUN npm run build

# Expose ports
EXPOSE 3000
EXPOSE 3002

# Start both the frontend and proxy server
CMD npm run preview & node src/server/proxy.js