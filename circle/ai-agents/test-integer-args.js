#!/usr/bin/env node

import WebSocket from 'ws';

async function testIntegerArgs() {
  console.log('🔧 Testing zkEngine with integer arguments...');
  
  const ws = new WebSocket('ws://localhost:8001/ws');
  
  ws.on('open', () => {
    console.log('🔗 Connected to zkEngine');
    
    // Try with integer arguments based on the test case
    const proofRequest = {
      metadata: {
        function: "prove_device_proximity",
        arguments: ["5050", "5050"], // Only x, y as strings that parse to integers
        step_size: 10,
        explanation: "Simple proximity test"
      }
    };
    
    console.log('📤 Sending simple format:', JSON.stringify(proofRequest, null, 2));
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

testIntegerArgs();