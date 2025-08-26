#!/usr/bin/env node

import WebSocket from 'ws';

async function testZkEngineVerbose() {
  console.log('🔍 Testing zkEngine with verbose logging...');
  
  const ws = new WebSocket('ws://localhost:8001/ws');
  
  ws.on('open', () => {
    console.log('🔗 Connected to zkEngine');
    
    const proofRequest = {
      metadata: {
        function: "prove_device_proximity",
        arguments: ["verbose_test_" + Date.now()],
        step_size: 10,
        explanation: "Verbose test to understand response format"
      }
    };
    
    console.log('📤 Sending:', JSON.stringify(proofRequest, null, 2));
    ws.send(JSON.stringify(proofRequest));
  });
  
  ws.on('message', (data) => {
    console.log('\n📥 Raw message received:');
    console.log(data.toString());
    
    try {
      const parsed = JSON.parse(data.toString());
      console.log('\n📥 Parsed message:');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (error) {
      console.log('Could not parse as JSON');
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });
  
  ws.on('close', () => {
    console.log('🔌 Connection closed');
    process.exit(0);
  });
  
  // Keep alive for 45 seconds
  setTimeout(() => {
    console.log('\n⏰ Timeout reached, closing connection');
    ws.close();
  }, 45000);
}

testZkEngineVerbose();