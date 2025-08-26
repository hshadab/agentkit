#!/usr/bin/env node

import WebSocket from 'ws';

async function testCorrectFormat() {
  console.log('🔧 Testing zkEngine with correct argument format...');
  
  const ws = new WebSocket('ws://localhost:8001/ws');
  
  ws.on('open', () => {
    console.log('🔗 Connected to zkEngine');
    
    const proofRequest = {
      metadata: {
        function: "prove_device_proximity",
        arguments: ["agent_test_001", "5000", "5000"],
        step_size: 10,
        explanation: "AI agent authorization proof test"
      }
    };
    
    console.log('📤 Sending correct format:', JSON.stringify(proofRequest, null, 2));
    ws.send(JSON.stringify(proofRequest));
  });
  
  ws.on('message', (data) => {
    console.log('\n📥 Response:');
    try {
      const message = JSON.parse(data.toString());
      console.log(JSON.stringify(message, null, 2));
      
      if (message.type === 'proof_complete') {
        console.log('\n✅ Proof completed successfully!');
        ws.close();
      } else if (message.type === 'proof_error') {
        console.log('\n❌ Proof failed!');
        ws.close();
      }
    } catch (error) {
      console.log(data.toString());
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });
  
  ws.on('close', () => {
    console.log('🔌 Connection closed');
    process.exit(0);
  });
  
  // Wait up to 25 seconds for proof completion
  setTimeout(() => {
    console.log('\n⏰ Timeout reached');
    ws.close();
  }, 25000);
}

testCorrectFormat();