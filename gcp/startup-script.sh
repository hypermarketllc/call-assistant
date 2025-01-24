#!/bin/bash

# Install dependencies
apt-get update
apt-get install -y git nginx nodejs npm certbot python3-certbot-nginx

# Install PM2
npm install -g pm2

# Clone application (replace with your repo)
git clone https://github.com/your-repo/call-assistant.git /opt/call-assistant
cd /opt/call-assistant

# Install dependencies
npm install

# Copy configuration files
cp nginx.conf /etc/nginx/sites-available/call-assistant
ln -s /etc/nginx/sites-available/call-assistant /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Start Nginx
systemctl restart nginx