#!/bin/bash
echo "Building app..."
npm run build

# Variables
read -p "Enter SSH Username: " SERVER_USER
read -p "Enter Server IP Address: " SERVER_IP
read -s -p "Enter SSH Password: " PASSWORD
echo
SERVER_PATH="htdocs/src"
LOCAL_DIST_PATH="./dist"
LOCAL_PACKAGE_JSON="./package.json"
LOCAL_PACKAGE_LOCK="./package-lock.json"

# Generate zip file name with date format
DATE_SUFFIX=$(date +"%d_%b_%y")
ZIP_FILE="be_build_$DATE_SUFFIX.zip"

echo "Zipping dist and package files..."
zip -r $ZIP_FILE $LOCAL_DIST_PATH $LOCAL_PACKAGE_JSON $LOCAL_PACKAGE_LOCK

echo "Starting deployment..."

# Step 1: SSH to server and execute commands
sshpass -p "$PASSWORD" ssh -t $SERVER_USER@$SERVER_IP << EOF
  echo "Connected to server..."
  source ~/.bashrc
  cd $SERVER_PATH
  echo "Current npm version: $(npm -v)"
  echo "Current node version: $(node -v)"
  echo "Stopping server with pm2..."
  pm2 stop dist/server.js || echo "Server not running, continuing..."
  echo "Deleting files except .env..."
  find . -mindepth 1 ! -name '.env' -delete
EOF

echo "Copying zip file to server..."
# Step 2: Copy zip file to server
sshpass -p "$PASSWORD" scp $ZIP_FILE $SERVER_USER@$SERVER_IP:$SERVER_PATH

# Step 3: SSH to extract, install dependencies, and restart the server
sshpass -p "$PASSWORD" ssh -t $SERVER_USER@$SERVER_IP << EOF
  cd $SERVER_PATH
  source ~/.bashrc
  echo "Current npm version: $(npm -v)"
  echo "Current node version: $(node -v)"
  echo "Extracting zip file..."
  unzip $ZIP_FILE
  echo "Installing dependencies..."
  npm install
  echo "Starting server with pm2..."
  pm2 start dist/server.js
EOF

echo "Cleaning up local zip file..."
rm $ZIP_FILE

echo "Deployment complete!"