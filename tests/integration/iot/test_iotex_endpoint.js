#!/usr/bin/env node

// Test the IoTeX proof export endpoint

async function testIoTeXEndpoint() {
    console.log('🧪 Testing IoTeX proof export endpoint...\n');
    
    // Test with a known proof ID pattern
    const testProofIds = [
        'proof_location_1752073560903',
        'proof_device_proximity_1753666858066',
        'proof_device_proximity_1753666743436'
    ];
    
    for (const proofId of testProofIds) {
        console.log(`Testing proof ID: ${proofId}`);
        try {
            const response = await fetch(`http://localhost:8001/api/proof/${proofId}/iotex`);
            console.log(`  Status: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('  ✅ Success! Response:');
                console.log(`    - Device ID: ${data.device_id}`);
                console.log(`    - Coordinates: (${data.coordinates?.x}, ${data.coordinates?.y})`);
                console.log(`    - Has proof data: ${!!data.proof_data}`);
                console.log(`    - Proof data length: ${data.proof_data ? data.proof_data.length : 0}`);
                console.log(`    - Has public inputs: ${!!data.public_inputs}`);
                break;
            } else {
                const error = await response.json();
                console.log(`  ❌ Error: ${error.error}`);
            }
        } catch (error) {
            console.log(`  ❌ Request failed: ${error.message}`);
        }
        console.log('');
    }
}

// Wait a bit for server to be ready
setTimeout(testIoTeXEndpoint, 5000);
console.log('Waiting 5 seconds for server to be ready...');