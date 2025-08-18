#!/usr/bin/env node

// Mock CCTP Backend for Testing UI Integration
// Simulates the CCTP workflow execution without real blockchain transactions

import WebSocket, { WebSocketServer } from 'ws';
import CCTPHandler from './cctpHandler.js';

const PORT = 8003;

class MockCCTPBackend {
    constructor() {
        this.wss = null;
        this.activeTransfers = new Map();
        this.mockCctpHandler = new CCTPHandler();
    }

    async start() {
        console.log('🚀 Starting Mock CCTP Backend for UI Testing...');
        
        this.wss = new WebSocketServer({ port: PORT });
        
        this.wss.on('connection', (ws) => {
            console.log('👤 Client connected to CCTP backend');
            
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data);
                    await this.handleMessage(ws, message);
                } catch (error) {
                    console.error('Message parse error:', error);
                }
            });
            
            ws.on('close', () => {
                console.log('👤 Client disconnected from CCTP backend');
            });
        });
        
        console.log(`✅ Mock CCTP Backend listening on port ${PORT}`);
        console.log('📝 Ready to receive CCTP workflow requests...');
    }

    async handleMessage(ws, message) {
        console.log('📨 Received message:', message.type);
        
        switch (message.type) {
            case 'cctp_transfer_request':
                await this.handleCCTPTransferRequest(ws, message);
                break;
            case 'test_cctp_workflow':
                await this.handleTestWorkflow(ws, message);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    async handleCCTPTransferRequest(ws, message) {
        const { amount, fromNetwork, toNetwork, agentId, recipient } = message;
        const workflowId = `cctp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`🌉 Starting CCTP transfer workflow: ${workflowId}`);
        console.log(`   Route: ${fromNetwork} → ${toNetwork}`);
        console.log(`   Amount: ${amount} USDC`);
        console.log(`   Agent: ${agentId}`);
        
        // Send workflow started
        ws.send(JSON.stringify({
            type: 'cctp_workflow_started',
            workflow_id: workflowId,
            amount,
            fromNetwork,
            toNetwork,
            agentId,
            recipient
        }));
        
        // Store transfer for tracking
        this.activeTransfers.set(workflowId, {
            amount,
            fromNetwork,
            toNetwork,
            agentId,
            recipient,
            startTime: Date.now()
        });
        
        // Execute workflow steps with realistic timing
        await this.executeWorkflowSteps(ws, workflowId);
    }

    async executeWorkflowSteps(ws, workflowId) {
        const steps = [
            { id: 'zkp_authorization', duration: 2000, name: 'ZKP Authorization' },
            { id: 'onchain_verification', duration: 3000, name: 'On-Chain Verification' },
            { id: 'usdc_burn', duration: 4000, name: 'USDC Burn' },
            { id: 'circle_attestation', duration: 6000, name: 'Circle Attestation' },
            { id: 'usdc_mint', duration: 3000, name: 'USDC Mint' }
        ];
        
        for (const step of steps) {
            // Send step start
            ws.send(JSON.stringify({
                type: 'cctp_step_update',
                workflow_id: workflowId,
                step_id: step.id,
                status: 'in_progress',
                message: `Processing ${step.name}...`
            }));
            
            // Wait for step duration
            await this.sleep(step.duration);
            
            // Send step completion with mock results
            const result = this.generateMockStepResult(step.id);
            
            ws.send(JSON.stringify({
                type: 'cctp_step_update',
                workflow_id: workflowId,
                step_id: step.id,
                status: 'completed',
                result: result,
                message: `${step.name} completed successfully`
            }));
            
            console.log(`   ✅ Step completed: ${step.name}`);
        }
        
        // Send workflow completion
        const transferData = this.activeTransfers.get(workflowId);
        
        ws.send(JSON.stringify({
            type: 'cctp_workflow_complete',
            workflow_id: workflowId,
            ...transferData,
            completedAt: new Date().toISOString(),
            totalTime: Date.now() - transferData.startTime
        }));
        
        console.log(`🎉 CCTP workflow completed: ${workflowId}`);
        this.activeTransfers.delete(workflowId);
    }

    generateMockStepResult(stepId) {
        const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
        const blockNumber = Math.floor(Math.random() * 1000000) + 18000000;
        
        switch (stepId) {
            case 'zkp_authorization':
                return {
                    proofId: `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    verified: true,
                    zkEngine: true
                };
                
            case 'onchain_verification':
                return {
                    transactionHash: mockTxHash,
                    blockNumber: blockNumber,
                    explorerUrl: `https://sepolia.etherscan.io/tx/${mockTxHash}`,
                    verified: true
                };
                
            case 'usdc_burn':
                return {
                    transactionHash: mockTxHash,
                    blockNumber: blockNumber,
                    explorerUrl: `https://sepolia.etherscan.io/tx/${mockTxHash}`,
                    burnedAmount: '5.0',
                    messageBytes: `0xmsg${Math.random().toString(16).substr(2, 60)}`
                };
                
            case 'circle_attestation':
                return {
                    attestation: `0xatt${Math.random().toString(16).substr(2, 100)}`,
                    messageHash: `0x${Math.random().toString(16).substr(2, 64)}`,
                    received: true
                };
                
            case 'usdc_mint':
                return {
                    transactionHash: mockTxHash,
                    blockNumber: blockNumber,
                    explorerUrl: `https://sepolia.basescan.org/tx/${mockTxHash}`,
                    mintedAmount: '5.0'
                };
                
            default:
                return { success: true };
        }
    }

    async handleTestWorkflow(ws, message) {
        console.log('🧪 Starting test CCTP workflow...');
        
        await this.handleCCTPTransferRequest(ws, {
            amount: '5.0',
            fromNetwork: 'ethereum-sepolia',
            toNetwork: 'base-sepolia',
            agentId: 'cross_chain_executor_001',
            recipient: '0x742d35Cc6634C0532925a3b8D402b1DeF8d87d87'
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Command line interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const backend = new MockCCTPBackend();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'start':
        case undefined:
            await backend.start();
            break;
            
        case 'test':
            console.log('🧪 Testing CCTP workflow simulation...');
            // This would connect to the backend and send test messages
            break;
            
        default:
            console.log('Usage: node mock-cctp-backend.js [start|test]');
    }
    
    // Keep the process running
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down Mock CCTP Backend...');
        process.exit(0);
    });
}

export default MockCCTPBackend;