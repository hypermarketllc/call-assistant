#!/bin/bash

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build frontend
npm run build

# Update permissions
sudo chown -R www-data:www-data /var/www/call-assistant
sudo chmod -R 755 /var/www/call-assistant

# Reload Nginx configuration
sudo nginx -t && sudo systemctl reload nginx

# Restart PM2 processes
pm2 restart ecosystem.config.js

# Optional: Clean up old builds
npm prune --production
