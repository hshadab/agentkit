const { ethers } = require('ethers');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const RPC_URL = 'https://eth-sepolia.public.blastapi.io';
const PRIVATE_KEY = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
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
            
            console.log('✅ Witness generated\n');
            
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
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Connect to verifier contract
    const verifier = new ethers.Contract(VERIFIER_ADDRESS, deploymentInfo.abi, wallet);
    
    // Format proof for Solidity
    const a = [proof.pi_a[0], proof.pi_a[1]];
    const b = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
    const c = [proof.pi_c[0], proof.pi_c[1]];
    
    // The public signals from the circuit are: [valid, decision, confidence, threshold]
    // But the verifier expects: [decision, confidence, threshold, reserved]
    // So we need to skip the first signal (valid) and add a dummy 4th
    const signals = [publicSignals[1], publicSignals[2], publicSignals[3], "0"];
    
    console.log('📊 Public signals:', signals);
    console.log('   - Decision:', signals[0] === "1" ? "APPROVE" : "DENY");
    console.log('   - Confidence:', signals[1] + '%');
    console.log('   - Threshold:', signals[2] + '%\n');
    
    // Estimate gas
    console.log('⛽ Estimating gas...');
    const gasEstimate = await verifier.verifyProof.estimateGas(a, b, c, signals);
    console.log('   Estimated gas:', gasEstimate.toString());
    
    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log('   Gas price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei');
    
    const estimatedCost = gasEstimate * gasPrice;
    console.log('   Estimated cost:', ethers.formatEther(estimatedCost), 'ETH\n');
    
    // Call verifyProof (this is a view function, so it doesn't send a transaction)
    console.log('📤 Calling verifyProof (view function)...');
    const isValid = await verifier.verifyProof(a, b, c, signals);
    
    console.log('✅ Verification result:', isValid ? 'VALID' : 'INVALID');
    
    console.log('✅ Transaction confirmed!');
    console.log('   Block number:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    
    const actualCost = receipt.gasUsed * receipt.gasPrice;
    console.log('   Actual cost:', ethers.formatEther(actualCost), 'ETH');
    console.log('   Status:', receipt.status === 1 ? 'Success' : 'Failed');
    
    // Check events
    const events = receipt.logs.map(log => {
        try {
            return verifier.interface.parseLog(log);
        } catch (e) {
            return null;
        }
    }).filter(e => e !== null);
    
    if (events.length > 0) {
        console.log('\n📢 Events emitted:');
        events.forEach(event => {
            console.log('   -', event.name);
            if (event.name === 'JOLTProofVerified') {
                console.log('     Proof ID:', event.args[0]);
                console.log('     Decision:', event.args[1].toString());
                console.log('     Confidence:', event.args[2].toString());
            }
        });
    }
    
    console.log('\n🔗 View on Etherscan:');
    console.log('   https://sepolia.etherscan.io/tx/' + tx.hash);
    
    return receipt;
}

async function main() {
    console.log('🚀 Testing JOLT On-Chain Verification\n');
    console.log('📍 Verifier contract:', VERIFIER_ADDRESS);
    console.log('🔗 Network: Sepolia\n');
    
    try {
        // Generate proof
        const { proof, publicSignals } = await generateJOLTProof();
        
        // Verify on-chain
        const receipt = await verifyOnChain(proof, publicSignals);
        
        console.log('\n✅ Test completed successfully!');
        console.log('   Real gas cost:', receipt.gasUsed.toString(), 'gas');
        
        // Save test results
        const results = {
            timestamp: new Date().toISOString(),
            verifierAddress: VERIFIER_ADDRESS,
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            gasPrice: receipt.gasPrice.toString(),
            totalCost: ethers.formatEther(receipt.gasUsed * receipt.gasPrice) + ' ETH',
            publicSignals: publicSignals
        };
        
        const resultsPath = path.join(__dirname, '../../test-results/jolt-onchain-' + Date.now() + '.json');
        fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        
        console.log('\n📁 Results saved to:', resultsPath);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);