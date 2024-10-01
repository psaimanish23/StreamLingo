#!/bin/bash

# Start your Node.js server in the background
npm run start &

# # Start ngrok
ngrok config add-authtoken $NGROK_AUTHTOKEN
ngrok http --domain=suited-working-barnacle.ngrok-free.app 3000