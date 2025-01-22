#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Install PM2
sudo npm install -g pm2

# Create SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Copy Nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/call-assistant
sudo ln -s /etc/nginx/sites-available/call-assistant /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Install dependencies
npm install

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup