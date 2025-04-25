#!/bin/bash

# Script to stop, clean, build, and start the server with PM2

echo "Stopping all PM2 processes..."
pm2 stop all

echo "Deleting all PM2 processes..."
pm2 delete all

echo "Building the project..."
npm run build

echo "Starting server with PM2 in production mode..."
pm2 start ecosystem.config.js --env production

echo "Server started successfully!"
