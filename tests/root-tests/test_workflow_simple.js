#!/usr/bin/env node

// Simple workflow test - KYC proof generation
import WebSocket from 'ws';
import fetch from 'node-fetch';

class WorkflowTest {
    constructor() {
        this.ws = null;
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            console.log('Connecting to WebSocket...');
            this.ws = new WebSocket('ws://localhost:8001/ws');
            
            this.ws.on('open', () => {
                console.log('✅ WebSocket connected');
                resolve();
            });
            
            this.ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                console.log(`📨 ${msg.type}:`, msg.status || msg.proof_id || 'received');
            });
            
            this.ws.on('error', reject);
        });
    }
    
    async testWorkflow() {
        console.log('\n🧪 Testing KYC workflow...\n');
        
        const query = "Generate a KYC compliance proof and verify it on Ethereum";
        
        console.log('📝 Query:', query);
        console.log('Sending to chat service...\n');
        
        try {
            const response = await fetch('http://localhost:8002/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: query })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Workflow created!');
            console.log('Workflow ID:', result.workflow_id);
            console.log('Status:', result.status);
            
            if (result.steps) {
                console.log('\nSteps:');
                result.steps.forEach((step, i) => {
                    console.log(`  ${i+1}. ${step.description || step.action}`);
                });
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            throw error;
        }
    }
    
    async checkUI() {
        console.log('\n🌐 UI Check:');
        console.log('Open http://localhost:8000 to see workflow cards');
        console.log('The workflow should appear with progress indicators');
    }
}

async function main() {
    const test = new WorkflowTest();
    
    try {
        await test.connect();
        await test.testWorkflow();
        await test.checkUI();
        
        console.log('\n✅ Test completed!');
        
        // Keep connection open briefly to see messages
        setTimeout(() => {
            test.ws.close();
            process.exit(0);
        }, 5000);
        
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

main();