import WebSocket from 'ws';

class MockUIResponder {
    constructor() {
        this.ws = null;
        this.activeWorkflows = new Map();
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket('ws://localhost:8001/ws');
            
            this.ws.on('open', () => {
                console.log('✅ Mock UI connected to WebSocket server');
                resolve();
            });
            
            this.ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                this.handleMessage(message);
            });
            
            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            });
        });
    }

    handleMessage(message) {
        console.log(`[Mock UI] Received: ${message.type}`);
        
        switch(message.type) {
            case 'workflow_started':
                this.activeWorkflows.set(message.workflowId, message);
                console.log(`  Started workflow ${message.workflowId}`);
                break;
                
            case 'device_registration_request':
                console.log(`  Simulating device registration for ${message.deviceId}`);
                setTimeout(() => {
                    this.ws.send(JSON.stringify({
                        type: 'device_registration_response',
                        requestId: message.requestId,
                        success: true,
                        ioId: `ioID_${message.deviceId}_${Date.now()}`,
                        did: `did:io:${message.deviceId}`,
                        txHash: '0x' + Math.random().toString(16).substr(2, 64).padEnd(64, '0')
                    }));
                }, 500);
                break;
                
            case 'iotex_verification_request':
                console.log(`  Simulating IoTeX verification for ${message.proofId}`);
                setTimeout(() => {
                    this.ws.send(JSON.stringify({
                        type: 'iotex_verification_response',
                        requestId: message.requestId,
                        success: true,
                        transactionHash: '0x' + Math.random().toString(16).substr(2, 64).padEnd(64, '0'),
                        blockNumber: Math.floor(Math.random() * 1000000)
                    }));
                }, 500);
                break;
                
            case 'blockchain_verification_request':
                console.log(`  Simulating ${message.blockchain} verification for ${message.proofId}`);
                setTimeout(() => {
                    const txHash = '0x' + Math.random().toString(16).substr(2, 64).padEnd(64, '0');
                    this.ws.send(JSON.stringify({
                        type: 'blockchain_verification_response',
                        workflowId: message.workflowId,
                        proofId: message.proofId,
                        blockchain: message.blockchain,
                        transaction_hash: txHash,
                        explorer_url: `https://etherscan.io/tx/${txHash}`
                    }));
                }, 500);
                break;
                
            case 'workflow_completed':
                console.log(`  Workflow ${message.workflowId} completed: ${message.success ? 'SUCCESS' : 'FAILED'}`);
                this.activeWorkflows.delete(message.workflowId);
                break;
                
            case 'proof_complete':
                console.log(`  Proof ${message.proof_id} completed`);
                break;
                
            case 'proof_status':
                console.log(`  Proof status: ${message.status}`);
                break;
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Start the mock UI responder
const responder = new MockUIResponder();
responder.connect().then(() => {
    console.log('Mock UI responder is running. Press Ctrl+C to stop.');
}).catch(console.error);

// Keep the process running
process.on('SIGINT', () => {
    console.log('\nShutting down mock UI responder...');
    responder.disconnect();
    process.exit(0);
});