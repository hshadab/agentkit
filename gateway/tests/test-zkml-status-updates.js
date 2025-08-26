#!/usr/bin/env node

import fetch from 'node-fetch';

async function testZkmlStatusUpdates() {
    console.log('🧪 Testing zkML Proof Status Updates\n');
    console.log('=====================================\n');
    
    // Start zkML proof generation
    console.log('📊 Starting zkML proof generation...');
    
    const proofResponse = await fetch('http://localhost:8002/zkml/prove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            agentId: 'test-agent-' + Date.now(),
            agentType: 'transfer-assistant',
            amount: 0.01,
            operation: 'gateway-transfer',
            riskScore: 0.2
        })
    });
    
    const { sessionId, status } = await proofResponse.json();
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Initial status: ${status}`);
    console.log('');
    
    // Poll status every second
    console.log('📊 Polling for status updates:');
    let attempts = 0;
    const maxAttempts = 15;
    
    while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000));
        
        const statusResponse = await fetch(`http://localhost:8002/zkml/status/${sessionId}`);
        const statusData = await statusResponse.json();
        
        const elapsed = statusData.elapsedTime || (attempts + 1);
        console.log(`   [${elapsed.toFixed(1)}s] Status: ${statusData.status}`);
        
        if (statusData.status === 'completed') {
            console.log('');
            console.log('✅ zkML proof completed!');
            console.log(`   Model: ${statusData.proof.model}`);
            console.log(`   Trace length: ${statusData.proof.traceLength}`);
            console.log(`   Matrix: ${statusData.proof.matrixDimensions.rows}×${statusData.proof.matrixDimensions.cols}`);
            console.log(`   Generation time: ${statusData.proof.generationTime}s`);
            console.log('');
            console.log('📊 UI Status Updates Expected:');
            console.log('   1. PENDING → IN_PROGRESS (immediately)');
            console.log('   2. IN_PROGRESS → COMPLETED (after ~12s)');
            return;
        } else if (statusData.status === 'failed') {
            console.log('');
            console.log('❌ zkML proof failed:', statusData.error);
            return;
        }
        
        attempts++;
    }
    
    console.log('');
    console.log('⏱️ zkML proof timed out (still generating)');
    console.log('   This would show as FAILED in the UI');
}

testZkmlStatusUpdates().catch(console.error);