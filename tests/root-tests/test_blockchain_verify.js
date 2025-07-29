#!/usr/bin/env node

// Test blockchain verification with Nova proofs
import { ethers } from 'ethers';
import WebSocket from 'ws';
import fetch from 'node-fetch';

class BlockchainVerificationTest {
    constructor() {
        this.ws = null;
        this.provider = null;
        this.contract = null;
    }
    
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            console.log('Connecting to zkEngine WebSocket...');
            this.ws = new WebSocket('ws://localhost:8001/ws');
            
            this.ws.on('open', () => {
                console.log('✅ WebSocket connected');
                resolve();
            });
            
            this.ws.on('error', reject);
        });
    }
    
    async generateProof() {
        console.log('\n🔐 Generating device proximity proof...');
        
        const proof_request = {
            circuit: "device_proximity",
            inputs: {
                device_id: "BLOCKTEST123",
                x: 6000,
                y: 6000
            }
        };
        
        return new Promise((resolve, reject) => {
            this.ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                console.log(`📨 ${msg.type}:`, msg.status || msg.proof_id || 'received');
                
                if (msg.type === 'proof_complete' && msg.proof) {
                    resolve(msg.proof);
                } else if (msg.type === 'error') {
                    reject(new Error(msg.message));
                }
            });
            
            this.ws.send(JSON.stringify(proof_request));
        });
    }
    
    setupBlockchain() {
        console.log('\n🔗 Setting up blockchain connection...');
        
        // IoTeX testnet configuration
        const iotexTestnet = {
            chainId: 4690,
            name: 'IoTeX Testnet',
            rpcUrl: 'https://babel-api.testnet.iotex.io'
        };
        
        this.provider = new ethers.providers.JsonRpcProvider(iotexTestnet.rpcUrl);
        
        // Contract configuration
        const contractAddress = '0x8530eD8d1d42b784c88888a74515d12fE388Da77';
        const abi = [{
            "inputs": [
                {"internalType": "uint256[3]", "name": "i_z0_zi", "type": "uint256[3]"},
                {"internalType": "uint256[4]", "name": "U_i_cmW_U_i_cmE", "type": "uint256[4]"},
                {"internalType": "uint256[2]", "name": "u_i_cmW", "type": "uint256[2]"},
                {"internalType": "uint256[3]", "name": "cmT_r", "type": "uint256[3]"},
                {"internalType": "uint256[2]", "name": "pA", "type": "uint256[2]"},
                {"internalType": "uint256[2][2]", "name": "pB", "type": "uint256[2][2]"},
                {"internalType": "uint256[2]", "name": "pC", "type": "uint256[2]"},
                {"internalType": "uint256[4]", "name": "challenge_W_challenge_E_kzg_evals", "type": "uint256[4]"},
                {"internalType": "uint256[2][2]", "name": "kzg_proof", "type": "uint256[2][2]"},
                {"internalType": "bytes32", "name": "deviceId", "type": "bytes32"},
                {"internalType": "uint256", "name": "proofId", "type": "uint256"}
            ],
            "name": "verifyDeviceProximity",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        }];
        
        this.contract = new ethers.Contract(contractAddress, abi, this.provider);
        console.log('✅ Blockchain connection configured');
    }
    
    async testVerification(proof) {
        console.log('\n🧪 Testing on-chain verification...');
        
        try {
            const deviceId = ethers.utils.id('BLOCKTEST123');
            const proofId = Math.floor(Date.now() / 1000);
            
            console.log('Device ID (bytes32):', deviceId);
            console.log('Proof ID:', proofId);
            
            // Parse the zkEngine proof
            const parsedProof = this.parseZKEngineProof(proof);
            
            console.log('\nCalling contract.verifyDeviceProximity...');
            const result = await this.contract.callStatic.verifyDeviceProximity(
                parsedProof.i_z0_zi,
                parsedProof.U_i_cmW_U_i_cmE,
                parsedProof.u_i_cmW,
                parsedProof.cmT_r,
                parsedProof.pA,
                parsedProof.pB,
                parsedProof.pC,
                parsedProof.challenge_W_challenge_E_kzg_evals,
                parsedProof.kzg_proof,
                deviceId,
                proofId
            );
            
            console.log('✅ Verification result:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Verification failed:', error.reason || error.message);
            throw error;
        }
    }
    
    parseZKEngineProof(proof) {
        // Simple parser for zkEngine proof format
        console.log('\nParsing zkEngine proof...');
        
        // Mock parser - would need real implementation
        return {
            i_z0_zi: [
                "0x0000000000000000000000000000000000000000000000000000000000000001",
                "0x0000000000000000000000000000000000000000000000000000000000001770",
                "0x0000000000000000000000000000000000000000000000000000000000001770"
            ],
            U_i_cmW_U_i_cmE: [
                "0x0000000000000000000000000000000000000000000000000000000000000001",
                "0x0000000000000000000000000000000000000000000000000000000000000002",
                "0x0000000000000000000000000000000000000000000000000000000000000003",
                "0x0000000000000000000000000000000000000000000000000000000000000004"
            ],
            u_i_cmW: [
                "0x0000000000000000000000000000000000000000000000000000000000000001",
                "0x0000000000000000000000000000000000000000000000000000000000000002"
            ],
            cmT_r: [
                "0x0000000000000000000000000000000000000000000000000000000000000001",
                "0x0000000000000000000000000000000000000000000000000000000000000002",
                "0x0000000000000000000000000000000000000000000000000000000000000003"
            ],
            pA: [
                "0x0000000000000000000000000000000000000000000000000000000000000001",
                "0x0000000000000000000000000000000000000000000000000000000000000002"
            ],
            pB: [
                ["0x0000000000000000000000000000000000000000000000000000000000000001",
                 "0x0000000000000000000000000000000000000000000000000000000000000002"],
                ["0x0000000000000000000000000000000000000000000000000000000000000003",
                 "0x0000000000000000000000000000000000000000000000000000000000000004"]
            ],
            pC: [
                "0x0000000000000000000000000000000000000000000000000000000000000001",
                "0x0000000000000000000000000000000000000000000000000000000000000002"
            ],
            challenge_W_challenge_E_kzg_evals: [
                "0x0000000000000000000000000000000000000000000000000000000000000001",
                "0x0000000000000000000000000000000000000000000000000000000000000002",
                "0x0000000000000000000000000000000000000000000000000000000000000003",
                "0x0000000000000000000000000000000000000000000000000000000000000004"
            ],
            kzg_proof: [
                ["0x0000000000000000000000000000000000000000000000000000000000000001",
                 "0x0000000000000000000000000000000000000000000000000000000000000002"],
                ["0x0000000000000000000000000000000000000000000000000000000000000003",
                 "0x0000000000000000000000000000000000000000000000000000000000000004"]
            ]
        };
    }
}

async function main() {
    const test = new BlockchainVerificationTest();
    
    try {
        // 1. Connect to zkEngine
        await test.connectWebSocket();
        
        // 2. Generate proof
        const proof = await test.generateProof();
        console.log('\n✅ Proof generated successfully');
        
        // 3. Setup blockchain
        test.setupBlockchain();
        
        // 4. Test verification
        const verified = await test.testVerification(proof);
        
        if (verified) {
            console.log('\n🎉 Blockchain verification test PASSED!');
        } else {
            console.log('\n❌ Blockchain verification test FAILED');
        }
        
        test.ws.close();
        process.exit(verified ? 0 : 1);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        if (test.ws) test.ws.close();
        process.exit(1);
    }
}

main();