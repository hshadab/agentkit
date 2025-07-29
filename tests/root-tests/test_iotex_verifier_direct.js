#!/usr/bin/env node

import pkg from 'ethers';
const { ethers } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function testIoTeXVerifier() {
    console.log('🔧 IoTeX Verifier Contract Test\n');
    console.log('='.repeat(50) + '\n');
    
    const contractAddress = '0x5967d15c7a6fD3ef7F1f309e766f35252a9de10d';
    const rpcUrl = 'https://babel-api.testnet.iotex.io';
    
    try {
        // Connect to IoTeX testnet
        console.log('🌐 Connecting to IoTeX Testnet...');
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        
        // Check network
        const network = await provider.getNetwork();
        console.log('✅ Connected to network:', network.name, `(Chain ID: ${network.chainId})`);
        
        // Check contract
        console.log('\n📋 Checking contract...');
        const code = await provider.getCode(contractAddress);
        
        if (code === '0x') {
            console.log('❌ No contract found at address:', contractAddress);
            return;
        }
        
        console.log('✅ Contract deployed at:', contractAddress);
        console.log('   Contract size:', (code.length - 2) / 2, 'bytes');
        
        // Get latest block
        const block = await provider.getBlock('latest');
        console.log('\n📊 Network status:');
        console.log('   Latest block:', block.number);
        console.log('   Timestamp:', new Date(block.timestamp * 1000).toISOString());
        
        // Define ABI for key functions
        const abi = [
            "function owner() view returns (address)",
            "function rewardPool() view returns (uint256)",
            "function rewardPerProof() view returns (uint256)",
            "function deviceCount() view returns (uint256)",
            "function getDeviceInfo(bytes32 deviceId) view returns (bool registered, address owner, uint256 registrationTime, uint256 lastProofTime, uint256 pendingRewards)",
            "event ProofVerified(address indexed verifier, bytes32 indexed deviceId, uint256 proofId, bytes32 commitment)",
            "event DeviceRegistered(bytes32 indexed deviceId, address indexed owner)"
        ];
        
        const contract = new ethers.Contract(contractAddress, abi, provider);
        
        // Read contract state
        console.log('\n🔍 Contract state:');
        
        try {
            const owner = await contract.owner();
            console.log('   Owner:', owner);
        } catch (e) {
            console.log('   Owner: (function not available)');
        }
        
        try {
            const rewardPool = await contract.rewardPool();
            console.log('   Reward pool:', ethers.utils.formatEther(rewardPool), 'IOTX');
        } catch (e) {
            console.log('   Reward pool: (function not available)');
        }
        
        try {
            const rewardPerProof = await contract.rewardPerProof();
            console.log('   Reward per proof:', ethers.utils.formatEther(rewardPerProof), 'IOTX');
        } catch (e) {
            console.log('   Reward per proof: (function not available)');
        }
        
        try {
            const deviceCount = await contract.deviceCount();
            console.log('   Registered devices:', deviceCount.toString());
        } catch (e) {
            console.log('   Registered devices: (function not available)');
        }
        
        // Check a test device
        console.log('\n🔍 Checking test device...');
        const testDeviceId = ethers.utils.id("TEST_DEVICE_001");
        
        try {
            const deviceInfo = await contract.getDeviceInfo(testDeviceId);
            console.log('   Device ID:', testDeviceId);
            console.log('   Registered:', deviceInfo.registered);
            if (deviceInfo.registered) {
                console.log('   Owner:', deviceInfo.owner);
                console.log('   Registration time:', new Date(deviceInfo.registrationTime.toNumber() * 1000).toISOString());
                console.log('   Pending rewards:', ethers.utils.formatEther(deviceInfo.pendingRewards), 'IOTX');
            }
        } catch (e) {
            console.log('   Device info: (function not available)');
        }
        
        // Query recent events
        console.log('\n📜 Recent events (last 1000 blocks):');
        
        try {
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 1000);
            
            // Query ProofVerified events
            const proofFilter = contract.filters.ProofVerified();
            const proofEvents = await contract.queryFilter(proofFilter, fromBlock, currentBlock);
            console.log(`   Found ${proofEvents.length} ProofVerified events`);
            
            if (proofEvents.length > 0) {
                console.log('   Last proof:');
                const lastProof = proofEvents[proofEvents.length - 1];
                console.log('     Block:', lastProof.blockNumber);
                console.log('     Verifier:', lastProof.args.verifier);
                console.log('     Device ID:', lastProof.args.deviceId);
                console.log('     Proof ID:', lastProof.args.proofId.toString());
            }
            
            // Query DeviceRegistered events
            const deviceFilter = contract.filters.DeviceRegistered();
            const deviceEvents = await contract.queryFilter(deviceFilter, fromBlock, currentBlock);
            console.log(`   Found ${deviceEvents.length} DeviceRegistered events`);
            
        } catch (e) {
            console.log('   Event query failed:', e.message);
        }
        
        console.log('\n✅ IoTeX verifier contract test complete');
        console.log('\n📝 Contract details:');
        console.log('   Address:', contractAddress);
        console.log('   Explorer:', `https://testnet.iotexscan.io/address/${contractAddress}`);
        console.log('   Network: IoTeX Testnet (Chain ID: 4690)');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.code) {
            console.error('   Error code:', error.code);
        }
    }
}

// Run the test
testIoTeXVerifier();