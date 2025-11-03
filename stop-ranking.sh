#!/bin/bash
echo "Stopping Ranking Engine..."
pm2 stop ecosystem.config.js
pm2 delete ecosystem.config.js
echo "Ranking Engine stopped!"

