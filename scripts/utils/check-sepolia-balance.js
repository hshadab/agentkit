#!/usr/bin/env node
const { ethers } = require('ethers');
require('dotenv').config();

const WALLET_ADDRESS = '0x27aFfeb992734022531Aaf8bD03C189518898D3F';

async function checkBalance() {
    console.log('🔍 Checking Sepolia Balance for your Phantom wallet\n');
    console.log('Wallet Address:', WALLET_ADDRESS);
    
    // Try multiple RPC endpoints
    const rpcUrls = [
        process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
        'https://rpc.sepolia.org',
        'https://ethereum-sepolia.publicnode.com',
        'https://1rpc.io/sepolia'
    ];
    
    let connected = false;
    let provider;
    
    for (const rpcUrl of rpcUrls) {
        try {
            console.log(`\nTrying RPC: ${rpcUrl.includes('YOUR_') ? 'Infura (needs API key)' : rpcUrl}`);
            provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            
            // Test connection
            await provider.getBlockNumber();
            console.log('✅ Connected successfully');
            connected = true;
            break;
        } catch (error) {
            console.log('❌ Failed to connect');
            continue;
        }
    }
    
    if (!connected) {
        console.log('\n❌ Could not connect to Sepolia network');
        console.log('Please set up an Infura API key or try again later');
        return;
    }
    
    try {
        // Get balance
        const balance = await provider.getBalance(WALLET_ADDRESS);
        const balanceInEth = ethers.utils.formatEther(balance);
        
        console.log('\n💰 Balance:', balanceInEth, 'ETH');
        
        // Check if balance is sufficient for deployment
        const minRequired = 0.01; // Rough estimate for deployment
        
        if (parseFloat(balanceInEth) < minRequired) {
            console.log(`\n⚠️  Low balance! You need at least ${minRequired} ETH to deploy`);
            console.log('\n🚰 Get free Sepolia ETH from:');
            console.log('   - https://sepoliafaucet.com/');
            console.log('   - https://www.alchemy.com/faucets/ethereum-sepolia');
            console.log('   - https://sepolia-faucet.pk910.de/');
            console.log('   - https://faucet.quicknode.com/ethereum/sepolia');
        } else {
            console.log('\n✅ Sufficient balance for deployment!');
            
            // Estimate deployment cost
            const gasPrice = await provider.getFeeData();
            const deploymentGas = 1500000; // Rough estimate
            const estimatedCost = (gasPrice.gasPrice * BigInt(deploymentGas)) / BigInt(10**18);
            
            console.log(`\n📊 Deployment estimate:`);
            console.log(`   Gas Price: ${ethers.formatUnits(gasPrice.gasPrice, 'gwei')} gwei`);
            console.log(`   Estimated Cost: ~${ethers.utils.formatEther(estimatedCost)} ETH`);
        }
        
        // Show recent transactions
        console.log('\n📜 Checking recent activity...');
        const latestBlock = await provider.getBlockNumber();
        const txCount = await provider.getTransactionCount(WALLET_ADDRESS);
        console.log(`   Transaction Count: ${txCount}`);
        console.log(`   Current Block: ${latestBlock}`);
        
    } catch (error) {
        console.error('\n❌ Error checking balance:', error.message);
    }
}

checkBalance().catch(console.error);