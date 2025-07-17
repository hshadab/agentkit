const http = require('http');

// Test complete workflow through chat API
async function testWorkflow(command) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ message: command });
        
        const options = {
            hostname: 'localhost',
            port: 8002,
            path: '/chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        
        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    console.log(`\n✅ Command: "${command}"`);
                    console.log('Response:', JSON.stringify(result, null, 2));
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing Complete Verifiable Agent Kit System\n');
    
    // Test 1: Simple proof generation
    console.log('=== TEST 1: Simple Proof Generation ===');
    await testWorkflow('Generate KYC proof');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
    
    await testWorkflow('Generate location proof');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testWorkflow('Prove AI content authenticity');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Proof History
    console.log('\n=== TEST 2: Proof History ===');
    await testWorkflow('Proof history');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Complex workflow
    console.log('\n=== TEST 3: Complex Workflow ===');
    await testWorkflow('Generate KYC proof, verify it locally, then send 0.01 USDC to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 on Ethereum if verified');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test 4: Multi-condition workflow
    console.log('\n=== TEST 4: Multi-Condition Workflow ===');
    await testWorkflow('If Alice is KYC verified send her 0.05 USDC on Ethereum and if Bob is KYC verified send him 0.03 USDC on Solana');
    
    console.log('\n✅ All tests completed!');
}

runTests().catch(console.error);