/**
 * Groth16 Backend for JOLT On-Chain Verification V2
 * 
 * This service provides both:
 * 1. FREE verification (view function) - just checks if proof is valid
 * 2. PERMANENT verification (transaction) - records proof on-chain with gas cost
 */

const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3004;

// Configuration
const RPC_URL = 'https://eth-sepolia.public.blastapi.io';
const PRIVATE_KEY = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';

// Two verifier options
const SIMPLE_VERIFIER = '0x1279FEDc2A21Ae16dC6bfE2bE0B89175f98BD308'; // View only (free)
const STORAGE_VERIFIER = '0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944'; // State-changing (costs gas)

// Load ABIs
const simpleDeployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../deployments/jolt-simple-verifier-sepolia.json'), 'utf8')
);
const storageDeployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../deployments/jolt-storage-verifier-sepolia.json'), 'utf8')
);

// Circuit paths
const CIRCUIT_DIR = path.join(__dirname, '../circuits/jolt-verifier');

// Initialize provider and contracts
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const simpleVerifier = new ethers.Contract(SIMPLE_VERIFIER, simpleDeployment.abi, provider);
const storageVerifier = new ethers.Contract(STORAGE_VERIFIER, storageDeployment.abi, wallet);

/**
 * Generate circuit proof from zkML data
 */
async function generateCircuitProof(decision, confidence) {
    return new Promise((resolve, reject) => {
        const input = {
            decision: decision.toString(),
            confidence: confidence.toString()
        };
        
        const timestamp = Date.now();
        const inputPath = path.join(CIRCUIT_DIR, `input_${timestamp}.json`);
        fs.writeFileSync(inputPath, JSON.stringify(input));
        
        const witnessPath = path.join(CIRCUIT_DIR, `witness_${timestamp}.wtns`);
        const genWitness = spawn('node', [
            path.join(CIRCUIT_DIR, 'jolt_decision_simple_js/generate_witness.js'),
            path.join(CIRCUIT_DIR, 'jolt_decision_simple_js/jolt_decision_simple.wasm'),
            inputPath,
            witnessPath
        ]);
        
        genWitness.on('close', (code) => {
            if (code !== 0) {
                fs.unlinkSync(inputPath);
                reject(new Error('Witness generation failed'));
                return;
            }
            
            const proofPath = path.join(CIRCUIT_DIR, `proof_${timestamp}.json`);
            const publicPath = path.join(CIRCUIT_DIR, `public_${timestamp}.json`);
            
            const genProof = spawn('snarkjs', [
                'groth16', 'prove',
                path.join(CIRCUIT_DIR, 'jolt_decision_simple_final.zkey'),
                witnessPath,
                proofPath,
                publicPath
            ]);
            
            genProof.on('close', (code) => {
                // Clean up temp files
                fs.unlinkSync(inputPath);
                fs.unlinkSync(witnessPath);
                
                if (code !== 0) {
                    reject(new Error('Proof generation failed'));
                    return;
                }
                
                const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
                const publicSignals = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
                
                // Clean up proof files
                fs.unlinkSync(proofPath);
                fs.unlinkSync(publicPath);
                
                resolve({ proof, publicSignals });
            });
        });
    });
}

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        service: 'groth16-jolt-backend-v2',
        verifiers: {
            simple: SIMPLE_VERIFIER,
            storage: STORAGE_VERIFIER
        },
        network: 'sepolia'
    });
});

/**
 * Main workflow endpoint - offers both verification modes
 */
app.post('/groth16/workflow', async (req, res) => {
    try {
        const { 
            proofHash, 
            decision, 
            confidence,
            permanent = false  // NEW: if true, records on-chain (costs gas)
        } = req.body;
        
        console.log('\n🔗 Step 2: On-Chain Verification');
        console.log('   Mode:', permanent ? 'PERMANENT (costs gas)' : 'VIEW ONLY (free)');
        console.log('   Decision:', decision === 1 ? 'APPROVE' : 'DENY');
        console.log('   Confidence:', confidence, '%');
        
        // Generate circuit proof
        console.log('   Generating circuit proof...');
        const { proof, publicSignals } = await generateCircuitProof(
            decision || 1,
            confidence || 95
        );
        
        // Format proof for Solidity
        const a = [proof.pi_a[0], proof.pi_a[1]];
        const b = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
        const c = [proof.pi_c[0], proof.pi_c[1]];
        
        if (permanent) {
            // PERMANENT VERIFICATION (costs gas, creates on-chain record)
            console.log('   📝 Creating permanent on-chain record...');
            
            // Estimate gas first
            const gasEstimate = await storageVerifier.verifyAndStore.estimateGas(a, b, c, publicSignals);
            const feeData = await provider.getFeeData();
            const estimatedCost = gasEstimate * feeData.gasPrice;
            
            console.log(`   ⛽ Estimated gas: ${gasEstimate} (${ethers.formatEther(estimatedCost)} ETH)`);
            
            // Send transaction
            const tx = await storageVerifier.verifyAndStore(a, b, c, publicSignals, {
                gasLimit: gasEstimate * 120n / 100n // 20% buffer
            });
            
            console.log(`   📤 Transaction sent: ${tx.hash}`);
            console.log('   ⏳ Waiting for confirmation...');
            
            const receipt = await tx.wait();
            const actualCost = receipt.gasUsed * receipt.gasPrice;
            
            console.log(`   ✅ Verified at block ${receipt.blockNumber}`);
            console.log(`   💰 Actual cost: ${ethers.formatEther(actualCost)} ETH`);
            
            // Extract proof ID from events
            let proofId = null;
            for (const log of receipt.logs) {
                try {
                    const parsed = storageVerifier.interface.parseLog(log);
                    if (parsed.name === 'DecisionVerified') {
                        proofId = parsed.args[0];
                        break;
                    }
                } catch (e) {}
            }
            
            res.json({
                success: true,
                permanent: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                proofId: proofId,
                gasUsed: receipt.gasUsed.toString(),
                cost: ethers.formatEther(actualCost) + ' ETH',
                contractAddress: STORAGE_VERIFIER,
                etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`,
                note: 'Proof permanently recorded on-chain'
            });
            
        } else {
            // VIEW ONLY VERIFICATION (free, no on-chain record)
            console.log('   👁️  Verifying with view function (free)...');
            const isValid = await simpleVerifier.verifyProof(a, b, c, publicSignals);
            
            const blockNumber = await provider.getBlockNumber();
            
            console.log(`   ✅ Verified at block ${blockNumber}: ${isValid ? 'VALID' : 'INVALID'}`);
            
            res.json({
                success: isValid,
                permanent: false,
                blockNumber: blockNumber,
                contractAddress: SIMPLE_VERIFIER,
                contractUrl: `https://sepolia.etherscan.io/address/${SIMPLE_VERIFIER}#readContract`,
                note: 'View-only verification (no permanent record)',
                tip: 'Set permanent=true to create on-chain record (costs ~0.0005 ETH)'
            });
        }
        
    } catch (error) {
        console.error('❌ Verification error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Check if a proof was previously verified (for permanent proofs)
 */
app.get('/groth16/check/:proofId', async (req, res) => {
    try {
        const { proofId } = req.params;
        
        const result = await storageVerifier.checkVerification(proofId);
        
        res.json({
            verified: result[0],
            decision: result[1].toString() === '1' ? 'APPROVE' : 'DENY',
            confidence: result[2].toString(),
            timestamp: result[3].toString(),
            contractAddress: STORAGE_VERIFIER,
            etherscanUrl: `https://sepolia.etherscan.io/address/${STORAGE_VERIFIER}#readContract`
        });
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

/**
 * Get verification options info
 */
app.get('/groth16/options', (req, res) => {
    res.json({
        modes: {
            view: {
                description: 'View-only verification (FREE)',
                contract: SIMPLE_VERIFIER,
                cost: '0 ETH',
                permanent: false,
                benefits: ['Instant', 'Free', 'No wallet needed'],
                drawbacks: ['No on-chain record', 'No proof of verification']
            },
            permanent: {
                description: 'State-changing verification (COSTS GAS)',
                contract: STORAGE_VERIFIER,
                estimatedCost: '~0.0005 ETH',
                permanent: true,
                benefits: [
                    'Permanent on-chain record',
                    'Event emission',
                    'Proof of verification',
                    'Prevents double-verification',
                    'Builds verifier reputation'
                ],
                drawbacks: ['Costs gas', 'Requires funded wallet']
            }
        },
        recommendation: 'Use view mode for testing, permanent mode for production'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 Groth16 JOLT Backend V2 Started');
    console.log(`   Port: ${PORT}`);
    console.log('\n📊 Verification Modes:');
    console.log('   1. VIEW ONLY (Free):');
    console.log(`      Contract: ${SIMPLE_VERIFIER}`);
    console.log('      No gas cost, no permanent record');
    console.log('\n   2. PERMANENT (Costs ~0.0005 ETH):');
    console.log(`      Contract: ${STORAGE_VERIFIER}`);
    console.log('      Creates permanent on-chain record with events');
    console.log('\n💡 Set permanent=true in request to use permanent mode\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    process.exit(0);
});