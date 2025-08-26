#!/usr/bin/env node

import WebSocket from 'ws';

async function testZkEngine() {
  const ws = new WebSocket('ws://localhost:8001/ws');
  
  ws.on('open', () => {
    console.log('🔗 Connected to zkEngine');
    
    // Test with a simple proof request using the expected format
    const testRequest = {
      metadata: {
        function: "list_proofs",
        arguments: [],
        step_size: 1,
        explanation: "List available proofs"
      }
    };
    
    console.log('📤 Sending test request:', JSON.stringify(testRequest));
    ws.send(JSON.stringify(testRequest));
    
    // Try a simple proof generation after 2 seconds
    setTimeout(() => {
      const proofRequest = {
        metadata: {
          function: "generate_proof",
          arguments: ["test_proof_" + Date.now()],
          step_size: 10,
          explanation: "Test proof generation"
        }
      };
      
      console.log('📤 Sending proof generation request:', JSON.stringify(proofRequest));
      ws.send(JSON.stringify(proofRequest));
    }, 2000);
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📥 Received:', JSON.stringify(message, null, 2));
    } catch (error) {
      console.log('📥 Received (raw):', data.toString());
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });
  
  ws.on('close', () => {
    console.log('🔌 Disconnected from zkEngine');
  });
  
  // Keep connection open for 10 seconds
  setTimeout(() => {
    ws.close();
    process.exit(0);
  }, 10000);
}

testZkEngine().catch(console.error);