#!/usr/bin/env node

// Simple test to check contract accessibility
const { ethers } = require('ethers');

async function testContractAccess() {
    console.log('🔗 Testing IoTeX contract access...\n');
    
    // IoTeX testnet configuration
    const provider = new ethers.providers.JsonRpcProvider('https://babel-api.testnet.iotex.io');
    const contractAddress = '0x8530eD8d1d42b784c88888a74515d12fE388Da77';
    
    try {
        // Check if contract is deployed
        const code = await provider.getCode(contractAddress);
        console.log('✅ Contract deployed:', code !== '0x');
        
        // Check network
        const network = await provider.getNetwork();
        console.log('✅ Network:', network.name, '(Chain ID:', network.chainId + ')');
        
        // Check latest block
        const blockNumber = await provider.getBlockNumber();
        console.log('✅ Latest block:', blockNumber);
        
        // Simple contract interface to check rewards balance
        const abi = [
            "function getDeviceInfo(bytes32) view returns (bool registered, address owner, uint256 registrationTime, uint256 lastProofTime, uint256 pendingRewards)",
            "function getContractBalance() view returns (uint256)"
        ];
        
        const contract = new ethers.Contract(contractAddress, abi, provider);
        
        // Try to call a view function
        try {
            const balance = await contract.getContractBalance();
            console.log('✅ Contract balance:', ethers.utils.formatEther(balance), 'IOTX');
        } catch (e) {
            console.log('ℹ️  Contract balance check failed (function may not exist)');
        }
        
        // Check a sample device
        const deviceId = ethers.utils.id('TEST123');
        try {
            const info = await contract.getDeviceInfo(deviceId);
            console.log('✅ Sample device check passed');
            console.log('   Registered:', info.registered);
        } catch (e) {
            console.log('ℹ️  Device info check failed:', e.reason || 'Unknown error');
        }
        
        console.log('\n✅ Contract accessibility test completed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testContractAccess();