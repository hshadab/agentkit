#!/usr/bin/env node
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Your Phantom wallet address
const DEPLOYER_ADDRESS = '0x27aFfeb992734022531Aaf8bD03C189518898D3F';

console.log('🚀 Ethereum Contract Deployment Helper\n');
console.log('This script will help you deploy the SimplifiedZKVerifier contract to Sepolia');
console.log('Using your Phantom wallet:', DEPLOYER_ADDRESS);

// Check if private key is set
if (!process.env.DEPLOYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY === 'YOUR_PRIVATE_KEY_HERE') {
    console.log('\n❌ Private key not set in .env file');
    console.log('\nTo get your private key from Phantom:');
    console.log('1. Open Phantom wallet');
    console.log('2. Click the menu (≡) → Settings');
    console.log('3. Click "Security & Privacy"');
    console.log('4. Click "Export Private Key"');
    console.log('5. Enter your password');
    console.log('6. Copy the private key (without 0x prefix)');
    console.log('7. Update .env file: DEPLOYER_PRIVATE_KEY=your_key_here');
    process.exit(1);
}

// Check if Infura key is set
if (!process.env.SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL.includes('YOUR_INFURA_KEY')) {
    console.log('\n⚠️  Infura API key not set');
    console.log('Using public RPC endpoint (may be slower)...');
}

console.log('\n✅ Configuration loaded');
console.log('\nWhen you\'re ready to deploy:');
console.log('1. Make sure you have at least 0.01 Sepolia ETH');
console.log('2. Run: npx hardhat run scripts/deploy.js --network sepolia');
console.log('\nTo check your balance first:');
console.log('Run: node check-sepolia-balance.js');

// Show current setup
console.log('\n📋 Current Setup:');
console.log('- Wallet:', DEPLOYER_ADDRESS);
console.log('- Network: Sepolia (Chain ID: 11155111)');
console.log('- Contract: SimplifiedZKVerifier');
console.log('- Private Key:', process.env.DEPLOYER_PRIVATE_KEY === 'YOUR_PRIVATE_KEY_HERE' ? '❌ Not set' : '✅ Set');
console.log('- RPC URL:', process.env.SEPOLIA_RPC_URL?.includes('YOUR_INFURA_KEY') ? '⚠️  Using public RPC' : '✅ Custom RPC set');

// Create a quick deployment command
const deployCommand = `
# Quick deployment command (copy and run):
DEPLOYER_ADDRESS="${DEPLOYER_ADDRESS}" npx hardhat run scripts/deploy.js --network sepolia
`;

console.log('\n📝 Quick Deploy Command:');
console.log(deployCommand);