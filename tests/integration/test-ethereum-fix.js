#!/usr/bin/env node

const http = require('http');

async function testEthereumEndpoint() {
    console.log('🧪 Testing Ethereum SNARK generation endpoint\n');
    
    // Test with a known proof ID
    const proofId = 'proof_location_1752602338965';
    console.log(`Testing with proof ID: ${proofId}`);
    console.log('This will take 20-30 seconds for SNARK generation...\n');
    
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8001,
            path: `/api/proof/${proofId}/ethereum-integrated`,
            method: 'GET',
            timeout: 180000 // 3 minute timeout
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`\n✅ Response received after ${elapsed} seconds`);
                
                try {
                    const jsonData = JSON.parse(data);
                    console.log('\nResponse structure:');
                    console.log('- Has proof:', !!jsonData.proof);
                    console.log('- Has public_signals:', !!jsonData.public_signals);
                    console.log('- Public signals count:', jsonData.public_signals?.length || 0);
                    console.log('- Has proof.a:', !!jsonData.proof?.a);
                    console.log('- Has proof.b:', !!jsonData.proof?.b);
                    console.log('- Has proof.c:', !!jsonData.proof?.c);
                    
                    if (jsonData.error) {
                        console.log('\n❌ Error in response:', jsonData.error);
                    } else {
                        console.log('\n✅ SNARK generation successful!');
                    }
                    
                    resolve(jsonData);
                } catch (e) {
                    console.log('\n❌ Failed to parse response:', e.message);
                    console.log('Raw response:', data.substring(0, 200));
                    reject(e);
                }
            });
        });
        
        req.on('error', (e) => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`\n❌ Request failed after ${elapsed} seconds:`, e.message);
            reject(e);
        });
        
        req.on('timeout', () => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`\n❌ Request timed out after ${elapsed} seconds`);
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        // Progress updates
        let dots = 0;
        const progressInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            process.stdout.write(`\rGenerating SNARK proof${'.'.repeat(dots % 4).padEnd(3)} (${elapsed}s elapsed)`);
            dots++;
        }, 1000);
        
        req.on('close', () => clearInterval(progressInterval));
        
        req.end();
    });
}

testEthereumEndpoint().catch(console.error);