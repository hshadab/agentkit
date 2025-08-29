const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { generateGroth16Proof } = require('./scripts/generate-groth16-proof');

async function testGroth16Verification() {
    try {
        console.log('🔍 Testing Groth16 on-chain verification...\n');
        
        // Load deployment info
        const deploymentInfo = JSON.parse(
            fs.readFileSync(path.join(__dirname, 'deployments/groth16-verifier.json'), 'utf8')
        );
        
        // Connect to Sepolia
        const provider = new ethers.JsonRpcProvider('https://eth-sepolia.public.blastapi.io', 11155111);
        console.log('Connected to Sepolia');
        
        // Create contract instance (read-only)
        const verifierContract = new ethers.Contract(deploymentInfo.address, deploymentInfo.abi, provider);
        console.log('Contract initialized at:', deploymentInfo.address);
        
        // Generate a proof
        console.log('\nGenerating Groth16 proof...');
        const zkmlProofData = {
            proofHash: '0x' + Math.random().toString(16).substr(2, 64),
            decision: 1,
            confidence: 95,
            amountValid: 1
        };
        
        const proofResult = await generateGroth16Proof(zkmlProofData);
        console.log('✅ Proof generated');
        console.log('Public signals:', proofResult.publicSignals);
        
        // Format for contract
        const a = [proofResult.proof.a[0], proofResult.proof.a[1]];
        const b = [[proofResult.proof.b[0][0], proofResult.proof.b[0][1]], 
                   [proofResult.proof.b[1][0], proofResult.proof.b[1][1]]];
        const c = [proofResult.proof.c[0], proofResult.proof.c[1]];
        const signals = proofResult.publicSignals.length === 5 
            ? proofResult.publicSignals 
            : proofResult.publicSignals.slice(0, 5);
        
        // Verify on-chain (view function call)
        console.log('\nVerifying proof on-chain...');
        const isValid = await verifierContract.verifyProof(a, b, c, signals);
        
        if (isValid) {
            const currentBlock = await provider.getBlockNumber();
            console.log('✅ PROOF VERIFIED ON-CHAIN!');
            console.log('   Block number:', currentBlock);
            console.log('   Contract:', deploymentInfo.address);
            console.log('   Network: Ethereum Sepolia');
            console.log('\n🎉 Real on-chain verification successful!');
        } else {
            console.log('❌ Proof verification failed');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.reason) console.error('Reason:', error.reason);
    }
}

testGroth16Verification().catch(console.error);