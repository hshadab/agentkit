#!/usr/bin/env node

const http = require('http');
const fs = require('fs');

async function makeRequest(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8001,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

async function testSystem() {
    console.log('🧪 Testing Verifiable Agent Kit System\n');
    
    // 1. Test basic connectivity
    console.log('1️⃣ Testing server connectivity...');
    try {
        const response = await makeRequest('/test');
        console.log('   ✅ Server is running:', response.data);
    } catch (e) {
        console.log('   ❌ Server connection failed:', e.message);
        return;
    }
    
    // 2. List recent proofs
    console.log('\n2️⃣ Listing recent proofs...');
    try {
        const response = await makeRequest('/api/proofs');
        console.log(`   ✅ Found ${response.data.proofs.length} proofs`);
        if (response.data.proofs.length > 0) {
            const recent = response.data.proofs[0];
            console.log(`   Most recent: ${recent.id} (${recent.type})`);
        }
    } catch (e) {
        console.log('   ❌ Failed to list proofs:', e.message);
    }
    
    // 3. Check a specific proof
    console.log('\n3️⃣ Testing proof data retrieval...');
    const testProofId = 'prove_kyc_1752599287763';
    try {
        // Test Solana endpoint (fast)
        const solanaResponse = await makeRequest(`/api/proof/${testProofId}/solana`);
        if (solanaResponse.status === 200) {
            console.log('   ✅ Solana proof data retrieved successfully');
            console.log(`      Commitment: ${solanaResponse.data.commitment.substring(0, 20)}...`);
            console.log(`      Proof type: ${solanaResponse.data.proof_type}`);
        } else {
            console.log('   ❌ Failed to get Solana proof data');
        }
    } catch (e) {
        console.log('   ❌ Error getting proof data:', e.message);
    }
    
    // 4. Check database synchronization
    console.log('\n4️⃣ Checking database synchronization...');
    const proofsDb = JSON.parse(fs.readFileSync('./proofs_db.json', 'utf8'));
    const dbProofCount = Object.keys(proofsDb).length;
    const fsProofCount = fs.readdirSync('./proofs').filter(d => d.startsWith('proof') || d.startsWith('prove')).length;
    
    console.log(`   Database proofs: ${dbProofCount}`);
    console.log(`   Filesystem proofs: ${fsProofCount}`);
    
    if (dbProofCount === fsProofCount) {
        console.log('   ✅ Database is synchronized');
    } else {
        console.log('   ⚠️  Database needs synchronization');
    }
    
    console.log('\n✅ System check complete!');
    console.log('\nTo test the UI:');
    console.log('1. Open http://localhost:8001 in your browser');
    console.log('2. Try generating a simple proof (KYC, Location, or AI Content)');
    console.log('3. Try local verification (should work immediately)');
    console.log('4. Try Solana verification (should work with the fixes)');
    console.log('5. Try Ethereum verification (will take 20-30 seconds for SNARK generation)');
}

testSystem().catch(console.error);