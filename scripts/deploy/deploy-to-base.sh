#!/bin/bash

echo "🚀 Base Sepolia Deployment Script"
echo "================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your PRIVATE_KEY"
    echo ""
    echo "Steps:"
    echo "1. cp env.example .env"
    echo "2. Edit .env and add your MetaMask private key"
    echo "   (Settings > Advanced > Account details > Export Private Key)"
    exit 1
fi

# Check if private key is set
if ! grep -q "PRIVATE_KEY=" .env || grep -q "PRIVATE_KEY=your_private_key_here" .env; then
    echo "❌ Error: PRIVATE_KEY not set in .env file!"
    echo "Please add your MetaMask private key to the .env file"
    exit 1
fi

echo "✅ .env file found with PRIVATE_KEY"

# Install missing dependencies
echo ""
echo "📦 Installing dependencies..."
npm install --save-dev @nomiclabs/hardhat-ethers@^2.2.3 @nomiclabs/hardhat-etherscan@^3.1.7 --legacy-peer-deps

# Compile contracts
echo ""
echo "📝 Compiling contracts..."
npx hardhat compile

# Deploy
echo ""
echo "🚀 Deploying to Base Sepolia..."
npm run deploy:base

echo ""
echo "✅ Deployment complete! Check the output above for the contract address."