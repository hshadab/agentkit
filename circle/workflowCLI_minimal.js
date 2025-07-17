#!/usr/bin/env node

import WebSocket from 'ws';

const command = process.argv.slice(2).join(' ');

async function executeSimpleWorkflow() {
    if (!command.toLowerCase().includes('kyc')) {
        console.error('Only KYC proof supported in minimal version');
        process.exit(1);
    }
    
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });
    
    const proofId = `proof_kyc_${Date.now()}`;
    
    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'proof_complete' && msg.proof_id === proofId) {
            console.log(`✅ Proof completed: ${proofId}`);
            ws.close();
            process.exit(0);
        }
    });
    
    const request = {
        message: "Generate KYC proof",
        proof_id: proofId,
        metadata: {
            function: "prove_kyc",
            arguments: ["12345", "1"],
            step_size: 50,
            explanation: "Zero-knowledge proof generation",
            additional_context: null
        }
    };
    
    ws.send(JSON.stringify(request));
}

executeSimpleWorkflow().catch(console.error);
