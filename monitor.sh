#!/bin/bash

# CPU and Memory Usage
echo "System Resource Monitoring"
top -bn1 | head -n 5

# Webhook Server Processes
echo -e "\nWebhook Server Processes"
ps aux | grep webhook

# Nginx Status
echo -e "\nNginx Status"
systemctl status nginx

# PM2 Process List
echo -e "\nPM2 Process List"
pm2 list

# Log File Sizes
echo -e "\nLog File Sizes"
du -h /var/log/nginx/*.log /var/log/letsencrypt/*.log
