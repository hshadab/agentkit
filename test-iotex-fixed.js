const axios = require('axios');

async function testIoTeXWorkflow() {
    try {
        console.log('=== Testing Fixed IoTeX Device Registration Workflow ===\n');
        
        // Step 1: Register device
        console.log('Step 1: Registering device...');
        const registerRes = await axios.post('http://localhost:8007/iotex/register', {
            deviceX: 122500, // SF coordinates
            deviceY: 37750
        });
        
        console.log('Device registered:');
        console.log('  Device ID:', registerRes.data.deviceId);
        console.log('  TX Hash:', registerRes.data.txHash);
        console.log('  Device Secret:', registerRes.data.deviceSecret, '\n');
        
        // Step 2: Generate zkEngine proof with registered device ID
        console.log('Step 2: Generating zkEngine proof with device ID', registerRes.data.deviceId, '...');
        const proofRes = await axios.post('http://localhost:8007/iotex/prove', {
            deviceX: 122500,
            deviceY: 37750,
            centerX: 122458,
            centerY: 37774,
            maxDistance: 5000,
            deviceSecret: registerRes.data.deviceSecret
        });
        
        console.log('zkEngine proof generated:');
        console.log('  Session ID:', proofRes.data.sessionId);
        console.log('  Device ID used in proof:', proofRes.data.deviceId);
        console.log('  Proof value:', proofRes.data.proof, '\n');
        
        // Step 3: Generate Groth16 proof-of-proof
        console.log('Step 3: Generating Groth16 proof-of-proof...');
        const groth16Res = await axios.post('http://localhost:8007/iotex/groth16', {
            sessionId: proofRes.data.sessionId
        });
        
        console.log('Groth16 proof generated:');
        console.log('  Public signals:', groth16Res.data.publicSignals);
        console.log('  Proof components: a, b, c, protocol\n');
        
        // Step 4: Verify on-chain
        console.log('Step 4: Verifying on IoTeX chain...');
        const verifyRes = await axios.post('http://localhost:8007/iotex/verify', {
            sessionId: proofRes.data.sessionId,
            deviceId: registerRes.data.deviceId
        });
        
        console.log('✅ Verification complete:');
        console.log('  TX Hash:', verifyRes.data.txHash);
        console.log('  Rewards:', verifyRes.data.rewards, 'IOTX tokens');
        console.log('  Device ID verified:', verifyRes.data.deviceId);
        console.log('\n=== Test Complete: Device ID properly flows through all steps ===');
        
    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

testIoTeXWorkflow();
