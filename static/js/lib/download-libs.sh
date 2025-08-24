#!/bin/bash

# Create lib directory if it doesn't exist
mkdir -p /home/hshadab/agentkit/static/js/lib

cd /home/hshadab/agentkit/static/js/lib

# Download Web3.js
echo "Downloading Web3.js..."
curl -L -o web3.min.js https://cdn.jsdelivr.net/npm/web3@1.10.0/dist/web3.min.js 2>/dev/null || echo "// Web3.js placeholder - CDN unavailable" > web3.min.js

# Download snarkjs
echo "Downloading snarkjs..."
curl -L -o snarkjs.min.js https://cdn.jsdelivr.net/gh/iden3/snarkjs/build/snarkjs.min.js 2>/dev/null || echo "// snarkjs placeholder - CDN unavailable" > snarkjs.min.js

# Download Solana Web3.js
echo "Downloading Solana Web3.js..."
curl -L -o solana-web3.min.js https://cdn.jsdelivr.net/npm/@solana/web3.js@1.87.6/lib/index.iife.min.js 2>/dev/null || echo "// Solana Web3.js placeholder - CDN unavailable" > solana-web3.min.js

# Download Ethers.js
echo "Downloading Ethers.js..."
curl -L -o ethers.umd.min.js https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js 2>/dev/null || echo "// Ethers.js placeholder - CDN unavailable" > ethers.umd.min.js

echo "Libraries download complete!"
ls -la *.js