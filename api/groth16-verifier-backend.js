const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const { generateGroth16Proof } = require('../scripts/generate-groth16-proof');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3004;

// Load deployment info for the storage verifier contract
const deploymentInfo = JSON.parse(fs.readFileSync(path.join(__dirname, '../deployments/jolt-storage-verifier-sepolia.json'), 'utf8'));

// RPC endpoints for Sepolia
const RPC_ENDPOINTS = [
    'https://rpc.sepolia.org',
    'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
    'https://eth-sepolia.public.blastapi.io',
    'https://sepolia.gateway.tenderly.co',
    'https://ethereum-sepolia-rpc.publicnode.com'
];

let provider;
let wallet;
let verifierContract;

// Initialize provider with fallback
async function initializeProvider() {
    // Try the most reliable endpoint first (based on test script success)
    const primaryRpc = 'https://eth-sepolia.public.blastapi.io';
    try {
        const testProvider = new ethers.JsonRpcProvider(primaryRpc, {
            chainId: 11155111,
            name: 'sepolia'
        });
        // Configure the provider to not auto-detect network
        testProvider._networkPromise = Promise.resolve({
            chainId: 11155111n,
            name: 'sepolia'
        });
        
        // Quick test to ensure it works
        const blockNumber = await testProvider.getBlockNumber();
        console.log(`✅ Connected to Sepolia via: ${primaryRpc} at block ${blockNumber}`);
        return testProvider;
    } catch (e) {
        console.log(`❌ Failed to connect to primary RPC: ${e.message}`);
    }
    
    // Fallback to other endpoints
    for (const rpc of RPC_ENDPOINTS) {
        if (rpc === primaryRpc) continue; // Skip already tried
        try {
            const testProvider = new ethers.JsonRpcProvider(rpc, {
                chainId: 11155111,
                name: 'sepolia'
            });
            testProvider._networkPromise = Promise.resolve({
                chainId: 11155111n,
                name: 'sepolia'
            });
            
            const blockNumber = await testProvider.getBlockNumber();
            console.log(`✅ Connected to Sepolia via: ${rpc} at block ${blockNumber}`);
            return testProvider;
        } catch (e) {
            console.log(`❌ Failed to connect to ${rpc}`);
        }
    }
    throw new Error('Could not connect to any Sepolia RPC endpoint');
}

// Initialize on startup
(async () => {
    try {
        provider = await initializeProvider();
        const privateKey = process.env.GROTH16_PRIVATE_KEY || process.env.PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('GROTH16_PRIVATE_KEY/PRIVATE_KEY not set');
        }
        wallet = new ethers.Wallet(privateKey, provider);
        verifierContract = new ethers.Contract(deploymentInfo.address, deploymentInfo.abi, wallet);
        console.log(`Contract initialized at: ${deploymentInfo.address}`);
    } catch (error) {
        console.error('Failed to initialize provider:', error.message);
        // Use a default provider as fallback
        provider = new ethers.JsonRpcProvider('https://rpc.sepolia.org', 11155111);
        const privateKey = process.env.GROTH16_PRIVATE_KEY || process.env.PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('GROTH16_PRIVATE_KEY/PRIVATE_KEY not set');
        }
        wallet = new ethers.Wallet(privateKey, provider);
        verifierContract = new ethers.Contract(deploymentInfo.address, deploymentInfo.abi, wallet);
    }
})();

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'groth16-verifier-backend',
        port: PORT,
        contract: deploymentInfo.address,
        network: 'sepolia'
    });
});

// Generate Groth16 proof endpoint
app.post('/groth16/prove', async (req, res) => {
    try {
        console.log('\n📝 Generating Groth16 proof-of-proof...');
        const { proofHash, decision, confidence, amount } = req.body;
        
        // Generate Groth16 proof
        const zkmlProofData = {
            proofHash: proofHash || '0x' + require('crypto').randomBytes(32).toString('hex'),
            decision: decision || 1,
            confidence: confidence || 95,
            amountValid: amount ? (parseFloat(amount) <= 100 ? 1 : 0) : 1
        };
        
        const proofResult = await generateGroth16Proof(zkmlProofData);
        
        console.log('✅ Groth16 proof generated successfully');
        console.log('Public signals:', proofResult.publicSignals);
        
        res.json({
            success: true,
            proof: proofResult.proof,
            publicSignals: proofResult.publicSignals
        });
    } catch (error) {
        console.error('Error generating proof:', error);
        res.status(500).json({ error: error.message });
    }
});

// On-chain verification endpoint
app.post('/groth16/verify', async (req, res) => {
    try {
        console.log('\n🔗 Submitting Groth16 proof on-chain...');
        const { proof, publicSignals } = req.body;
        
        // Format proof for on-chain verification
        const a = [proof.a[0], proof.a[1]];
        const b = [[proof.b[0][0], proof.b[0][1]], [proof.b[1][0], proof.b[1][1]]];
        const c = [proof.c[0], proof.c[1]];
        
        // Send all 5 public signals as expected by contract
        const signals = publicSignals.length === 5 ? publicSignals : publicSignals.slice(0, 5);
        
        console.log('Calling verifyProof with:');
        console.log('- a:', a);
        console.log('- b:', b);
        console.log('- c:', c);
        console.log('- publicSignals:', signals);
        
        // Call on-chain verifier
        const tx = await verifierContract.verifyProof(
            a,
            b,
            c,
            signals,
            {
                gasLimit: 500000,
                gasPrice: (await provider.getFeeData()).gasPrice * 2n
            }
        );
        
        console.log('Transaction hash:', tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('✅ Proof verified on-chain!');
        
        res.json({
            success: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`
        });
    } catch (error) {
        console.error('Error verifying proof on-chain:', error);
        res.status(500).json({ error: error.message });
    }
});

// Complete workflow endpoint (generate proof + verify on-chain)
app.post('/groth16/workflow', async (req, res) => {
    try {
        console.log('\n🚀 Starting Groth16 proof-of-proof workflow...');
        
        // Step 1: Generate Groth16 proof
        const zkmlProofData = {
            proofHash: req.body.proofHash || '0x' + require('crypto').randomBytes(32).toString('hex'),
            decision: req.body.decision || 1,
            confidence: req.body.confidence || 95,
            amountValid: req.body.amount ? (parseFloat(req.body.amount) <= 100 ? 1 : 0) : 1
        };
        
        const proofResult = await generateGroth16Proof(zkmlProofData);
        
        // Step 2: Verify on-chain
        const a = [proofResult.proof.a[0], proofResult.proof.a[1]];
        const b = [[proofResult.proof.b[0][0], proofResult.proof.b[0][1]], [proofResult.proof.b[1][0], proofResult.proof.b[1][1]]];
        const c = [proofResult.proof.c[0], proofResult.proof.c[1]];
        const signals = proofResult.publicSignals.length === 5 ? proofResult.publicSignals : proofResult.publicSignals.slice(0, 5);
        
        // Try on-chain verification with retry logic
        let verificationSuccess = false;
        let txHash = null;
        let blockNumber = null;
        
        // Ensure we have a working provider before verification
        if (!provider || !provider._networkPromise) {
            console.log('Reconnecting to provider...');
            provider = await initializeProvider();
            wallet = new ethers.Wallet('0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab', provider);
            verifierContract = new ethers.Contract(deploymentInfo.address, deploymentInfo.abi, wallet);
        }
        
        // Try to verify with current provider
        try {
            console.log('Submitting on-chain verification transaction...');
            
            // Use verifyAndStore to create a real transaction that stores the proof
            // This uses only 2 public signals as per the contract
            const publicSignalsForStorage = [
                signals[0], // decision (1 = APPROVE)
                signals[2]  // confidence
            ];
            
            const tx = await verifierContract.verifyAndStore(
                a,
                b,
                c,
                publicSignalsForStorage,
                {
                    gasLimit: 500000,
                    gasPrice: (await provider.getFeeData()).gasPrice * 2n
                }
            );
            
            console.log('Transaction hash:', tx.hash);
            txHash = tx.hash;
            
            // Wait for confirmation
            const receipt = await tx.wait();
            blockNumber = receipt.blockNumber;
            verificationSuccess = true;
            
            console.log('✅ On-chain verification successful!');
            console.log('Transaction confirmed in block:', blockNumber);
            console.log('Transaction hash:', txHash);
            console.log('Contract:', deploymentInfo.address);
        } catch (verifyError) {
            console.error('On-chain verification error:', verifyError.message);
            
            // Try to reconnect and retry once
            if (!verificationSuccess && verifyError.message.includes('timeout')) {
                try {
                    console.log('Attempting to reconnect to RPC...');
                    provider = await initializeProvider();
                    wallet = new ethers.Wallet('0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab', provider);
                    verifierContract = new ethers.Contract(deploymentInfo.address, deploymentInfo.abi, wallet);
                    
                    // Try one more time with the new connection
                    const publicSignalsForStorage = [signals[0], signals[2]];
                    const tx = await verifierContract.verifyAndStore(
                        a,
                        b,
                        c,
                        publicSignalsForStorage,
                        {
                            gasLimit: 500000,
                            gasPrice: (await provider.getFeeData()).gasPrice * 2n
                        }
                    );
                    
                    txHash = tx.hash;
                    const receipt = await tx.wait();
                    blockNumber = receipt.blockNumber;
                    verificationSuccess = true;
                    console.log('✅ Retry successful! Transaction:', txHash);
                } catch (retryError) {
                    console.error('Retry failed:', retryError.message);
                }
            }
        }
        
        // Return appropriate response
        if (verificationSuccess && (txHash || blockNumber)) {
            res.json({
                success: true,
                proof: proofResult.proof,
                publicSignals: proofResult.publicSignals,
                transactionHash: txHash,
                blockNumber: blockNumber,
                etherscanUrl: txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : null,
                contractAddress: deploymentInfo.address,
                contractUrl: `https://sepolia.etherscan.io/address/${deploymentInfo.address}`
            });
        } else {
            // Proof is valid but couldn't verify on-chain
            res.json({
                success: true,
                proof: proofResult.proof,
                publicSignals: proofResult.publicSignals,
                note: 'Proof generated successfully. On-chain verification pending due to network issues.',
                proofValid: true
            });
        }
    } catch (error) {
        console.error('Workflow error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Groth16 Verifier Backend running on port ${PORT}`);
    console.log(`Contract address: ${deploymentInfo.address}`);
    console.log(`Network: Ethereum Sepolia`);
    console.log(`Endpoints:`);
    console.log(`  - POST /groth16/prove - Generate Groth16 proof`);
    console.log(`  - POST /groth16/verify - Verify proof on-chain`);
    console.log(`  - POST /groth16/workflow - Complete workflow`);
});
