#!/usr/bin/env node

// Check IoTeX contract balance and device rewards
import { ethers } from 'ethers';
import { readFileSync } from 'fs';

// Hardcode config for now
const config = {
    blockchain: {
        iotex: {
            contracts: {
                deviceVerifier: '0xAafE6C7ab60A8594a673791aB3DaDDb7b7CC0B14'
            },
            rpcUrl: 'https://babel-api.testnet.iotex.io'
        }
    }
};

const contractAddress = config.blockchain.iotex.contracts.deviceVerifier;
const rpcUrl = config.blockchain.iotex.rpcUrl;

// Contract ABI (correct functions from iotex-device-verifier.js)
const contractABI = [
    {
        "inputs": [],
        "name": "getContractBalance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "name": "deviceRewards",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "deviceId", "type": "bytes32"}],
        "name": "getDevice",
        "outputs": [
            {
                "components": [
                    {"internalType": "address", "name": "owner", "type": "address"},
                    {"internalType": "bool", "name": "registered", "type": "bool"},
                    {"internalType": "uint256", "name": "registrationTime", "type": "uint256"},
                    {"internalType": "string", "name": "ioId", "type": "string"},
                    {"internalType": "string", "name": "did", "type": "string"},
                    {"internalType": "uint256", "name": "totalRewards", "type": "uint256"},
                    {"internalType": "bool", "name": "isVerified", "type": "bool"}
                ],
                "internalType": "struct IoTeXProximityVerifier.Device",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

async function checkContract() {
    console.log('🔍 Checking IoTeX Contract Status');
    console.log('=====================================');
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`RPC URL: ${rpcUrl}`);
    
    try {
        // Connect to IoTeX
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        
        // Check contract balance
        console.log('\n💰 Contract Balance Check:');
        try {
            const contractBalance = await contract.getContractBalance();
            console.log(`Contract Balance: ${ethers.utils.formatEther(contractBalance)} IOTX`);
        } catch (error) {
            console.log(`❌ Could not get contract balance: ${error.message}`);
        }
        
        // Check recent device IDs from logs
        const testDeviceIds = [
            'DEV123', // From SUCCESSFUL test!
            'SENSOR_1755367690316_164', // From latest test
            'SENSOR_1755365672698_113', // From recent test
            'SENSOR_1755343334332_412', // From earlier test
            'SENSOR_1755342046576_866'  // From earlier test
        ];
        
        console.log('\n📋 Device Registration & Rewards Check:');
        for (const deviceId of testDeviceIds) {
            const deviceIdBytes32 = ethers.utils.id(deviceId);
            console.log(`\nDevice: ${deviceId}`);
            console.log(`Bytes32: ${deviceIdBytes32}`);
            
            try {
                const deviceInfo = await contract.getDevice(deviceIdBytes32);
                console.log(`  Registered: ${deviceInfo.registered}`);
                console.log(`  Owner: ${deviceInfo.owner}`);
                console.log(`  IoID: ${deviceInfo.ioId}`);
                console.log(`  DID: ${deviceInfo.did}`);
                console.log(`  Total Rewards: ${ethers.utils.formatEther(deviceInfo.totalRewards)} IOTX`);
                console.log(`  Verified: ${deviceInfo.isVerified}`);
                
                if (deviceInfo.registered) {
                    const rewards = await contract.deviceRewards(deviceIdBytes32);
                    console.log(`  Claimable Rewards: ${ethers.utils.formatEther(rewards)} IOTX`);
                }
            } catch (error) {
                console.log(`  ❌ Error checking device: ${error.message}`);
            }
        }
        
        // Check contract code
        console.log('\n🔧 Contract Code Check:');
        const contractCode = await provider.getCode(contractAddress);
        if (contractCode === '0x') {
            console.log('❌ No contract code found at this address!');
        } else {
            console.log(`✅ Contract code exists (${contractCode.length} bytes)`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkContract().catch(console.error);