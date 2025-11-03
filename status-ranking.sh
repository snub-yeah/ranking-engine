#!/bin/bash
echo "PM2 Process Status:"
pm2 status
pm2 logs --lines 10

