#!/usr/bin/env node

/**
 * Device Proximity Demo
 * 
 * This script demonstrates the complete IoT device proximity workflow:
 * 1. Register a device on IoTeX blockchain with ioID
 * 2. Generate a zero-knowledge proof of device proximity  
 * 3. Verify the proof on IoTeX blockchain
 * 4. Claim rewards for the device
 */

import WebSocket from 'ws';
import fetch from 'node-fetch';

const DEVICE_ID = 'demo_device_' + Date.now();
const LOCATION = { x: 5050, y: 5050 }; // Near center (5000, 5000) with radius 100

class DeviceProximityDemo {
    constructor() {
        this.ws = null;
        this.proofData = null;
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            console.log('🔌 Connecting to WebSocket server...');
            this.ws = new WebSocket('ws://localhost:8001/ws');
            
            this.ws.on('open', () => {
                console.log('✅ Connected to WebSocket server\n');
                resolve();
            });
            
            this.ws.on('message', (data) => {
                this.handleMessage(JSON.parse(data.toString()));
            });
            
            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            });
            
            this.ws.on('close', () => {
                console.log('🔌 WebSocket connection closed');
            });
        });
    }
    
    handleMessage(message) {
        switch(message.type) {
            case 'proof_status':
                console.log(`⏳ Proof generation status: ${message.status}`);
                break;
                
            case 'proof_complete':
                console.log(`✅ Proof generated successfully!`);
                console.log(`   Proof ID: ${message.proof_id}`);
                console.log(`   Generation time: ${message.metadata?.generation_time_secs?.toFixed(2)}s`);
                this.proofData = message;
                break;
                
            case 'proof_error':
                console.error(`❌ Proof generation failed: ${message.error}`);
                break;
                
            default:
                console.log(`📨 Received: ${message.type}`);
        }
    }
    
    async runWorkflow() {
        try {
            console.log('🚀 Starting Device Proximity Workflow\n');
            console.log(`📱 Device ID: ${DEVICE_ID}`);
            console.log(`📍 Location: (${LOCATION.x}, ${LOCATION.y})`);
            console.log(`🎯 Target: Center (5000, 5000) with radius 100\n`);
            
            // Step 1: Generate proof
            console.log('Step 1: Generating zero-knowledge proof...');
            await this.generateProof();
            
            // Step 2: Execute workflow via API
            console.log('\nStep 2: Executing blockchain workflow...');
            await this.executeWorkflow();
            
            console.log('\n✅ Demo completed successfully!');
            console.log('   Check the UI at http://localhost:8000 to see the workflow cards');
            
        } catch (error) {
            console.error('❌ Demo failed:', error);
        } finally {
            if (this.ws) {
                this.ws.close();
            }
        }
    }
    
    async generateProof() {
        const proofRequest = {
            type: 'proof_request',
            proof_type: 'device_proximity',
            input_data: {
                device_id: DEVICE_ID,
                location: LOCATION,
                metadata: {
                    timestamp: new Date().toISOString(),
                    device_type: 'sensor'
                }
            }
        };
        
        this.ws.send(JSON.stringify(proofRequest));
        
        // Wait for proof to complete
        await new Promise((resolve) => {
            const checkProof = setInterval(() => {
                if (this.proofData) {
                    clearInterval(checkProof);
                    resolve();
                }
            }, 500);
        });
    }
    
    async executeWorkflow() {
        const workflowRequest = {
            query: `Register device ${DEVICE_ID}, generate proximity proof at (${LOCATION.x}, ${LOCATION.y}), verify on IoTeX, and claim rewards`,
            context: {
                device_id: DEVICE_ID,
                location: LOCATION,
                proof_data: this.proofData
            }
        };
        
        console.log('   Sending workflow request to AI parser...');
        
        const response = await fetch('http://localhost:5000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(workflowRequest)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('   Workflow ID:', result.workflow_id);
        console.log('   Status:', result.status);
        
        if (result.steps) {
            console.log('\n   Workflow steps:');
            result.steps.forEach((step, index) => {
                console.log(`   ${index + 1}. ${step.description || step.action}`);
            });
        }
        
        return result;
    }
}

// Run the demo
async function main() {
    console.log('====================================');
    console.log('   IoT Device Proximity Demo');
    console.log('====================================\n');
    
    const demo = new DeviceProximityDemo();
    
    try {
        await demo.connect();
        await demo.runWorkflow();
    } catch (error) {
        console.error('Demo error:', error);
        process.exit(1);
    }
    
    // Keep process alive for a bit to see final messages
    setTimeout(() => {
        process.exit(0);
    }, 5000);
}

main().catch(console.error);