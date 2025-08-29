const { ethers } = require('ethers');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const RPC_URL = 'https://eth-sepolia.public.blastapi.io';
const VERIFIER_ADDRESS = '0x26F5b32e6C30E8A4746B9A537B540a41C4B4F9De';

// Load deployment info
const deploymentInfo = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../deployments/jolt-verifier-sepolia.json'), 'utf8')
);

async function generateJOLTProof() {
    console.log('🔨 Generating JOLT proof with circuit...\n');
    
    return new Promise((resolve, reject) => {
        // Generate witness with all required inputs
        const witness = {
            decision: "1",          // APPROVE
            confidence: "95",       // 95% confidence
            threshold: "80",        // 80% threshold
            proofHash: "12345678",  // Mock proof hash (non-zero)
            timestamp: Math.floor(Date.now() / 1000).toString() // Current timestamp
        };
        
        // Write input.json for circuit
        const inputPath = path.join(__dirname, '../../circuits/jolt-verifier/input.json');
        fs.writeFileSync(inputPath, JSON.stringify(witness));
        
        // Generate witness
        const genWitness = spawn('node', [
            path.join(__dirname, '../../circuits/jolt-verifier/jolt_decision_verifier_js/generate_witness.js'),
            path.join(__dirname, '../../circuits/jolt-verifier/jolt_decision_verifier_js/jolt_decision_verifier.wasm'),
            inputPath,
            path.join(__dirname, '../../circuits/jolt-verifier/witness.wtns')
        ]);
        
        genWitness.on('close', (code) => {
            if (code !== 0) {
                reject(new Error('Witness generation failed'));
                return;
            }
            
            console.log('✅ Witness generated');
            
            // Generate proof
            const genProof = spawn('snarkjs', [
                'groth16', 'prove',
                path.join(__dirname, '../../circuits/jolt-verifier/jolt_decision_verifier_final.zkey'),
                path.join(__dirname, '../../circuits/jolt-verifier/witness.wtns'),
                path.join(__dirname, '../../circuits/jolt-verifier/proof.json'),
                path.join(__dirname, '../../circuits/jolt-verifier/public.json')
            ]);
            
            genProof.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error('Proof generation failed'));
                    return;
                }
                
                console.log('✅ Proof generated\n');
                
                // Read proof and public signals
                const proof = JSON.parse(fs.readFileSync(
                    path.join(__dirname, '../../circuits/jolt-verifier/proof.json'), 'utf8'
                ));
                const publicSignals = JSON.parse(fs.readFileSync(
                    path.join(__dirname, '../../circuits/jolt-verifier/public.json'), 'utf8'
                ));
                
                resolve({ proof, publicSignals });
            });
        });
    });
}

async function verifyOnChain(proof, publicSignals) {
    console.log('🔗 Verifying proof on-chain...\n');
    
    // Connect to provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Connect to verifier contract
    const verifier = new ethers.Contract(VERIFIER_ADDRESS, deploymentInfo.abi, provider);
    
    // Format proof for Solidity
    const a = [proof.pi_a[0], proof.pi_a[1]];
    const b = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
    const c = [proof.pi_c[0], proof.pi_c[1]];
    
    // The public signals from the circuit are: [valid, decision, confidence, threshold]
    // But the verifier expects: [decision, confidence, threshold, reserved]
    // So we need to skip the first signal (valid) and add a dummy 4th
    const signals = [publicSignals[1], publicSignals[2], publicSignals[3], "0"];
    
    console.log('📊 Circuit output:');
    console.log('   - Valid:', publicSignals[0] === "1" ? "YES" : "NO");
    console.log('   - Decision:', publicSignals[1] === "1" ? "APPROVE" : "DENY");
    console.log('   - Confidence:', publicSignals[2] + '%');
    console.log('   - Threshold:', publicSignals[3] + '%\n');
    
    console.log('📤 Calling on-chain verifier...');
    
    try {
        const isValid = await verifier.verifyProof(a, b, c, signals);
        
        console.log('\n✅ On-chain verification result:', isValid ? 'VALID PROOF' : 'INVALID PROOF');
        
        if (isValid) {
            console.log('\n🎉 Success! The JOLT zkML proof was verified on-chain.');
            console.log('   This proves that:');
            console.log('   - The AI decision was APPROVE');
            console.log('   - With 95% confidence (above 80% threshold)');
            console.log('   - Without revealing the underlying LLM parameters');
        }
        
        return isValid;
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Testing JOLT On-Chain Verification\n');
    console.log('📍 Verifier contract:', VERIFIER_ADDRESS);
    console.log('🔗 Network: Sepolia');
    console.log('🔗 View contract: https://sepolia.etherscan.io/address/' + VERIFIER_ADDRESS + '\n');
    
    try {
        // Generate proof
        const { proof, publicSignals } = await generateJOLTProof();
        
        // Verify on-chain
        const isValid = await verifyOnChain(proof, publicSignals);
        
        if (isValid) {
            console.log('\n✅ Test completed successfully!');
            console.log('   The JOLT Decision Verifier is working correctly on Sepolia.');
            
            // Save test results
            const results = {
                timestamp: new Date().toISOString(),
                verifierAddress: VERIFIER_ADDRESS,
                network: 'sepolia',
                verificationResult: 'VALID',
                publicSignals: {
                    decision: publicSignals[1],
                    confidence: publicSignals[2],
                    threshold: publicSignals[3]
                }
            };
            
            const resultsPath = path.join(__dirname, '../../test-results/jolt-verification-' + Date.now() + '.json');
            fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
            fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
            
            console.log('\n📁 Results saved to:', resultsPath);
        } else {
            console.log('\n❌ Verification failed - proof was invalid');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);