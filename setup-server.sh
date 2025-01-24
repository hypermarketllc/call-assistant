#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Copy Nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/call-assistant
sudo ln -s /etc/nginx/sites-available/call-assistant /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Install dependencies and build
npm install
npm run build

# Start application with PM2
npm run start

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup