#!/bin/bash

# ============================================================
# Elegant MD-to-PDF Automated Deployment Script
# ============================================================

IMAGE_NAME="elegant-md-pdf"
CONTAINER_NAME="md-pdf-service"
PORT="3000"

echo "------------------------------------------"
echo "🚀 Starting Automated Deployment..."
echo "------------------------------------------"

# 1. Pull latest changes
echo "📥 [1/4] Pulling latest code from Git..."
git pull

# 2. Build new image
echo "🛠️ [2/4] Rebuilding Docker image..."
docker build -t $IMAGE_NAME:latest .

# 3. Check and clean up existing container
if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "🛑 [3/4] Stopping and removing old container..."
    docker stop $CONTAINER_NAME >/dev/null
    docker rm $CONTAINER_NAME >/dev/null
else
    echo "🔍 [3/4] No existing container found, skipping cleanup."
fi

# 4. Run new container
echo "🏃 [4/4] Starting new container on port $PORT..."
docker run -d \
    -p $PORT:3000 \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    $IMAGE_NAME:latest

echo "------------------------------------------"
echo "✅ Deployment Successful!"
echo "🌍 Service available at http://localhost:$PORT"
echo "------------------------------------------"
