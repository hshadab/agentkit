#!/usr/bin/env node

/**
 * Setup script to configure a funded wallet for Sepolia deployment
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

console.log("🔧 Wallet Setup for Sepolia Deployment\n");
console.log("=" .repeat(60));

// Check current configuration
const envPath = path.join(__dirname, '..', '.env');
const currentEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

if (currentEnv.includes('SEPOLIA_PRIVATE_KEY')) {
    console.log("✅ SEPOLIA_PRIVATE_KEY already configured in .env");
    
    // Test the configured wallet
    const provider = new ethers.providers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY || currentEnv.match(/SEPOLIA_PRIVATE_KEY=(\w+)/)?.[1];
    
    if (privateKey) {
        const wallet = new ethers.Wallet(privateKey, provider);
        wallet.getBalance().then(balance => {
            console.log(`\n📊 Wallet Status:`);
            console.log(`   Address: ${wallet.address}`);
            console.log(`   Balance: ${ethers.utils.formatEther(balance)} ETH`);
            
            if (balance.gte(ethers.utils.parseEther("0.005"))) {
                console.log(`   Status: ✅ Ready to deploy (sufficient balance)`);
            } else {
                console.log(`   Status: ❌ Insufficient balance (need 0.005 ETH)`);
                console.log(`\n💡 Fund your wallet at: https://sepoliafaucet.com`);
            }
        }).catch(console.error);
    }
} else {
    console.log("⚠️  No SEPOLIA_PRIVATE_KEY found in .env\n");
    console.log("To add your funded wallet:");
    console.log("1. Get your wallet's private key (from MetaMask or your wallet)");
    console.log("2. Run this command:");
    console.log(`   echo "SEPOLIA_PRIVATE_KEY=your_private_key_here" >> ${envPath}`);
    console.log("\n⚠️  IMPORTANT: Never share or commit your private key!");
    console.log("\nExample (DO NOT USE THIS KEY):");
    console.log('   echo "SEPOLIA_PRIVATE_KEY=abc123...xyz789" >> .env');
    
    console.log("\n📝 Current .env file needs:");
    console.log("SEPOLIA_PRIVATE_KEY=<your_funded_wallet_private_key>");
}

console.log("\n" + "=" .repeat(60));
console.log("After adding your key, run:");
console.log("   npx hardhat run scripts/deploy-real-nova-verifier.js --network sepolia");