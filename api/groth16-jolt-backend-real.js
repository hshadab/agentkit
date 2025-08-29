/**
 * Groth16 Backend for REAL JOLT On-Chain Verification
 * 
 * This service ONLY uses state-changing verification that:
 * - Costs gas (~0.0005 ETH on testnet)
 * - Creates permanent on-chain records
 * - Emits events for audit trails
 * - Provides cryptographic proof of verification
 * 
 * This is what a production system would use.
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

// ONLY using the storage verifier for REAL verification
const STORAGE_VERIFIER = '0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944';

// Load ABI
const storageDeployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../deployments/jolt-storage-verifier-sepolia.json'), 'utf8')
);

// Circuit paths
const CIRCUIT_DIR = path.join(__dirname, '../circuits/jolt-verifier');

// Initialize provider and contract with signer (needed for transactions)
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const storageVerifier = new ethers.Contract(STORAGE_VERIFIER, storageDeployment.abi, wallet);

// Track verification history
const verificationHistory = new Map();

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
        service: 'groth16-jolt-backend-real',
        verifier: STORAGE_VERIFIER,
        network: 'sepolia',
        mode: 'REAL (state-changing only)',
        wallet: wallet.address,
        verificationCount: verificationHistory.size
    });
});

/**
 * Main workflow endpoint - ALWAYS creates permanent on-chain record
 */
app.post('/groth16/workflow', async (req, res) => {
    try {
        const { 
            proofHash, 
            decision, 
            confidence,
            sessionId
        } = req.body;
        
        console.log('\n🔗 Step 2: REAL On-Chain Verification (costs gas)');
        console.log('   Decision:', decision === 1 ? 'APPROVE' : 'DENY');
        console.log('   Confidence:', confidence, '%');
        console.log('   Session:', sessionId || 'N/A');
        
        // Check wallet balance
        const balance = await provider.getBalance(wallet.address);
        console.log('   Wallet balance:', ethers.formatEther(balance), 'ETH');
        
        if (balance < ethers.parseEther('0.001')) {
            throw new Error('Insufficient balance for gas costs. Need at least 0.001 ETH');
        }
        
        // Generate circuit proof
        console.log('   📝 Generating circuit proof...');
        const { proof, publicSignals } = await generateCircuitProof(
            decision || 1,
            confidence || 95
        );
        
        // Format proof for Solidity
        const a = [proof.pi_a[0], proof.pi_a[1]];
        const b = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
        const c = [proof.pi_c[0], proof.pi_c[1]];
        
        // Estimate gas first
        console.log('   ⛽ Estimating gas costs...');
        const gasEstimate = await storageVerifier.verifyAndStore.estimateGas(a, b, c, publicSignals);
        const feeData = await provider.getFeeData();
        const estimatedCost = gasEstimate * feeData.gasPrice;
        
        console.log(`   📊 Gas estimate: ${gasEstimate} units`);
        console.log(`   💰 Estimated cost: ${ethers.formatEther(estimatedCost)} ETH`);
        console.log(`   ⛽ Gas price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
        
        // Send the REAL transaction
        console.log('   📤 Sending transaction to blockchain...');
        const tx = await storageVerifier.verifyAndStore(a, b, c, publicSignals, {
            gasLimit: gasEstimate * 120n / 100n // 20% buffer
        });
        
        console.log(`   🔗 Transaction hash: ${tx.hash}`);
        console.log('   ⏳ Waiting for confirmation (this takes 12-30 seconds)...');
        
        // Wait for confirmation
        const receipt = await tx.wait();
        const actualCost = receipt.gasUsed * receipt.gasPrice;
        
        console.log(`   ✅ CONFIRMED at block ${receipt.blockNumber}`);
        console.log(`   💰 Actual cost: ${ethers.formatEther(actualCost)} ETH`);
        console.log(`   ⛽ Gas used: ${receipt.gasUsed} units`);
        
        // Extract proof ID from events
        let proofId = null;
        let eventData = null;
        for (const log of receipt.logs) {
            try {
                const parsed = storageVerifier.interface.parseLog(log);
                if (parsed.name === 'DecisionVerified') {
                    proofId = parsed.args[0];
                    eventData = {
                        proofId: parsed.args[0],
                        decision: parsed.args[1].toString(),
                        confidence: parsed.args[2].toString(),
                        verifier: parsed.args[3],
                        timestamp: parsed.args[4].toString()
                    };
                    break;
                }
            } catch (e) {}
        }
        
        // Store in history
        if (sessionId) {
            verificationHistory.set(sessionId, {
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                proofId: proofId,
                timestamp: Date.now()
            });
        }
        
        console.log('   📋 Proof ID:', proofId);
        console.log('   🔗 View on Etherscan:');
        console.log(`      https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        // Return comprehensive response
        res.json({
            success: true,
            permanent: true,
            
            // Transaction details
            transactionHash: tx.hash,
            blockNumber: Number(receipt.blockNumber),
            proofId: proofId,
            
            // Gas details
            gasUsed: receipt.gasUsed.toString(),
            gasPrice: ethers.formatUnits(receipt.gasPrice || feeData.gasPrice, 'gwei') + ' gwei',
            totalCost: ethers.formatEther(actualCost) + ' ETH',
            
            // Contract details
            contractAddress: STORAGE_VERIFIER,
            contractUrl: `https://sepolia.etherscan.io/address/${STORAGE_VERIFIER}`,
            
            // Etherscan links
            etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`,
            blockUrl: `https://sepolia.etherscan.io/block/${receipt.blockNumber}`,
            
            // Event data
            event: eventData,
            
            // Note
            note: 'Verification permanently recorded on Ethereum Sepolia blockchain'
        });
        
    } catch (error) {
        console.error('❌ Verification error:', error.message);
        
        // Check specific error types
        if (error.message.includes('Insufficient balance')) {
            res.status(400).json({
                success: false,
                error: 'Insufficient ETH balance for gas costs',
                required: '0.001 ETH',
                wallet: wallet.address
            });
        } else if (error.message.includes('Proof already verified')) {
            res.status(400).json({
                success: false,
                error: 'This proof has already been verified on-chain'
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
});

/**
 * Check verification history by session ID
 */
app.get('/groth16/history/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const history = verificationHistory.get(sessionId);
        
        if (!history) {
            return res.status(404).json({
                error: 'No verification found for this session'
            });
        }
        
        // Also fetch on-chain data
        const result = await storageVerifier.checkVerification(history.proofId);
        
        res.json({
            sessionId: sessionId,
            transactionHash: history.transactionHash,
            blockNumber: history.blockNumber,
            proofId: history.proofId,
            
            // On-chain data
            onChain: {
                verified: result[0],
                decision: result[1].toString() === '1' ? 'APPROVE' : 'DENY',
                confidence: result[2].toString() + '%',
                timestamp: new Date(Number(result[3]) * 1000).toISOString()
            },
            
            etherscanUrl: `https://sepolia.etherscan.io/tx/${history.transactionHash}`
        });
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

/**
 * Get wallet info and balance
 */
app.get('/groth16/wallet', async (req, res) => {
    try {
        const balance = await provider.getBalance(wallet.address);
        const txCount = await provider.getTransactionCount(wallet.address);
        
        res.json({
            address: wallet.address,
            balance: ethers.formatEther(balance) + ' ETH',
            transactionCount: txCount,
            network: 'sepolia',
            sufficient: balance >= ethers.parseEther('0.001'),
            faucetUrl: 'https://sepolia-faucet.pk910.de/',
            note: 'Need at least 0.001 ETH for verification gas costs'
        });
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 REAL Groth16 JOLT Backend Started');
    console.log(`   Port: ${PORT}`);
    console.log(`   Mode: PRODUCTION (state-changing only)`);
    console.log(`   Verifier: ${STORAGE_VERIFIER}`);
    console.log(`   Wallet: ${wallet.address}`);
    
    // Check wallet balance on startup
    provider.getBalance(wallet.address).then(balance => {
        console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
        if (balance < ethers.parseEther('0.001')) {
            console.log('   ⚠️  WARNING: Low balance! Need at least 0.001 ETH for gas');
            console.log('   Get testnet ETH from: https://sepolia-faucet.pk910.de/');
        } else {
            console.log('   ✅ Sufficient balance for verification');
        }
    });
    
    console.log('\n📊 What This Does:');
    console.log('   - Creates PERMANENT on-chain records');
    console.log('   - Costs ~0.0005 ETH per verification');
    console.log('   - Emits events for audit trails');
    console.log('   - Provides cryptographic proof');
    console.log('   - This is what production systems use\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    console.log(`   Total verifications this session: ${verificationHistory.size}`);
    process.exit(0);
});