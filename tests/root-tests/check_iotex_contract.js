#!/usr/bin/env node

const { ethers } = require('ethers');

async function checkContractBalance() {
    // IoTeX testnet configuration
    const provider = new ethers.providers.JsonRpcProvider('https://babel-api.testnet.iotex.io');
    const contractAddress = '0x5967d15c7a6fD3ef7F1f309e766f35252a9de10d';
    
    console.log('🔍 Checking IoTeX Device Verifier Contract\n');
    console.log('Contract Address:', contractAddress);
    console.log('Network: IoTeX Testnet\n');
    
    try {
        // Check contract balance
        const balance = await provider.getBalance(contractAddress);
        const balanceInIOTX = ethers.utils.formatEther(balance);
        
        console.log('💰 Contract Balance:', balanceInIOTX, 'IOTX');
        
        // Check if contract is deployed
        const code = await provider.getCode(contractAddress);
        console.log('📄 Contract Deployed:', code !== '0x' ? 'Yes' : 'No');
        
        // Get network info
        const network = await provider.getNetwork();
        console.log('🌐 Network Chain ID:', network.chainId);
        
        // Get latest block
        const blockNumber = await provider.getBlockNumber();
        console.log('📦 Latest Block:', blockNumber);
        
        // Contract ABI for checking if there's a withdrawal function
        const abi = [
            "function owner() view returns (address)",
            "function getContractBalance() view returns (uint256)",
            "function withdraw(uint256 amount) external",
            "function withdrawTo(address recipient, uint256 amount) external"
        ];
        
        const contract = new ethers.Contract(contractAddress, abi, provider);
        
        // Try to get owner
        try {
            const owner = await contract.owner();
            console.log('\n👤 Contract Owner:', owner);
        } catch (e) {
            console.log('\n⚠️  No owner function or not accessible');
        }
        
        // Try to get contract balance through function
        try {
            const contractBalance = await contract.getContractBalance();
            console.log('💰 Contract Balance (via function):', ethers.utils.formatEther(contractBalance), 'IOTX');
        } catch (e) {
            console.log('⚠️  No getContractBalance function');
        }
        
        console.log('\n📝 Note: To receive rewards from this contract, you need to:');
        console.log('1. Register your device using the registerDevice function');
        console.log('2. Submit valid proximity proofs');
        console.log('3. Accumulate rewards based on proof submissions');
        console.log('4. Call claimRewards (if available) or wait for automatic distribution');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Also provide your testnet address info
function showTestnetInfo() {
    console.log('\n\n📋 IoTeX Testnet Information:');
    console.log('----------------------------');
    console.log('Faucet: https://faucet.iotex.io/');
    console.log('Explorer: https://testnet.iotexscan.io/');
    console.log('\nTo get test IOTX:');
    console.log('1. Visit the faucet link above');
    console.log('2. Enter your wallet address');
    console.log('3. Complete the captcha');
    console.log('4. You should receive 1000 test IOTX');
}

checkContractBalance().then(() => {
    showTestnetInfo();
});