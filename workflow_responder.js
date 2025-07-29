import WebSocket from 'ws';

// Simple responder that simulates browser responses for workflow testing
class WorkflowResponder {
    constructor() {
        this.ws = null;
        this.proofs = new Map();
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket('ws://localhost:8001/ws');
            
            this.ws.on('open', () => {
                console.log('✅ Workflow responder connected');
                resolve();
            });
            
            this.ws.on('message', (data) => {
                this.handleMessage(JSON.parse(data.toString()));
            });
            
            this.ws.on('error', reject);
        });
    }
    
    handleMessage(message) {
        console.log(`📨 Received: ${message.type}`);
        
        switch(message.type) {
            case 'device_registration_request':
                console.log('  → Sending device_registration_response');
                setTimeout(() => {
                    this.ws.send(JSON.stringify({
                        type: 'device_registration_response',
                        requestId: message.requestId,
                        success: true,
                        ioId: `ioID_${message.deviceId}_${Date.now()}`,
                        did: `did:io:${message.deviceId}`,
                        txHash: '0x' + Math.random().toString(16).substr(2, 64)
                    }));
                }, 100);
                break;
                
            case 'proof_complete':
                console.log(`  ✅ Proof completed: ${message.proof_id}`);
                console.log(`     Has proof_data: ${!!message.proof_data}`);
                console.log(`     Proof size: ${message.proof_data?.length || 0} bytes`);
                this.proofs.set(message.proof_id, message);
                break;
                
            case 'iotex_verification_request':
                console.log('  → Sending iotex_verification_response');
                const proofData = message.proofData || this.proofs.get(message.proofId);
                setTimeout(() => {
                    this.ws.send(JSON.stringify({
                        type: 'iotex_verification_response',
                        requestId: message.requestId,
                        success: true,
                        txHash: '0x' + Math.random().toString(16).substr(2, 64),
                        transactionHash: '0x' + Math.random().toString(16).substr(2, 64)
                    }));
                }, 100);
                break;
                
            case 'claim_rewards_request':
                console.log('  → Sending claim_rewards_response');
                setTimeout(() => {
                    this.ws.send(JSON.stringify({
                        type: 'claim_rewards_response',
                        requestId: message.requestId,
                        success: true,
                        txHash: '0x' + Math.random().toString(16).substr(2, 64),
                        amount: '0.01',
                        currency: 'IOTX'
                    }));
                }, 100);
                break;
        }
    }
}

// Start the responder
const responder = new WorkflowResponder();
responder.connect().then(() => {
    console.log('🎯 Workflow responder ready - listening for requests...\n');
}).catch(console.error);

// Keep process alive
process.stdin.resume();