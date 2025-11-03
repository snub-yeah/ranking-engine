#!/bin/bash
echo "Starting Ranking Engine with PM2..."
pm2 start ecosystem.config.js
echo "Ranking Engine started!"
echo "Check status with: pm2 status"
echo "View logs with: pm2 logs"

