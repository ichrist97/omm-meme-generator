#!/bin/bash

( cd lib && yarn install --network-timeout 100000 && yarn link && yarn build)
( cd backend && yarn install --network-timeout 100000 && yarn link meme-generator-lib )
( cd meme-generator && yarn install --network-timeout 100000 && yarn link meme-generator-lib )

# Restore database
mongorestore -h localhost:27017 --drop -d meme-generator ./development_assets/database/meme-generator
