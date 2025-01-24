#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Copy Nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/call-assistant
sudo ln -s /etc/nginx/sites-available/call-assistant /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Create SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Start the application
docker-compose up -d