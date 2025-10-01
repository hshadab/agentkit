#!/usr/bin/env node

const { ethers } = require('ethers');

async function checkContract() {
    const RPC_URL = 'https://sepolia.basescan.org';
    const CONTRACT_ADDRESS = '0x3c4323fdBd592aaCF37C33dbF90e492CEe249599';

    try {
        // Connect to Base Sepolia
        const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');

        console.log('🔍 Checking contract at:', CONTRACT_ADDRESS);
        console.log('🌐 Network: Base Sepolia');
        console.log('🔗 RPC:', 'https://sepolia.base.org');
        console.log();

        // Get contract code
        const code = await provider.getCode(CONTRACT_ADDRESS);

        if (code === '0x') {
            console.log('❌ No contract found at this address!');
            console.log('   The address exists but has no code deployed.');
            console.log();
            console.log('💡 Possible issues:');
            console.log('   1. Contract not deployed to Base Sepolia');
            console.log('   2. Deployment transaction failed');
            console.log('   3. Wrong address in .env file');
            console.log();
            console.log('🔧 Solution: Re-deploy the verifier contract');
            process.exit(1);
        }

        console.log('✅ Contract exists!');
        console.log('📦 Bytecode length:', code.length, 'bytes');
        console.log();

        // Get network info
        const network = await provider.getNetwork();
        console.log('Network info:');
        console.log('  Chain ID:', network.chainId.toString());
        console.log('  Name:', network.name);
        console.log();

        // Check if it's an EOA or contract
        const balance = await provider.getBalance(CONTRACT_ADDRESS);
        console.log('Balance:', ethers.formatEther(balance), 'ETH');
        console.log();

        console.log('🔗 Explorer links:');
        console.log('  Base Sepolia (Basescan):', `https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`);
        console.log('  Base Sepolia (Blockscout):', `https://base-sepolia.blockscout.com/address/${CONTRACT_ADDRESS}`);

    } catch (error) {
        console.error('❌ Error checking contract:', error.message);
        process.exit(1);
    }
}

checkContract();
