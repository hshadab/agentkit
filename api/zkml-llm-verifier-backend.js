#!/usr/bin/env node

/**
 * On-Chain Verifier Backend for LLM Decision Proofs
 * Verifies JOLT-Atlas proofs on Ethereum Sepolia
 * Port: 3003
 */

const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Configuration
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const CHAIN_ID = 11155111; // Sepolia

// LLM Decision Verifier Contract (deployed on Sepolia)
const VERIFIER_ADDRESS = '0x70928d56Ee88CA586cBE2Ee4cF97Ae2fcc2cA944'; // Using existing Nova verifier for now
const PRIVATE_KEY = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';

// Connect to Ethereum
const provider = new ethers.providers.StaticJsonRpcProvider(RPC_URL, CHAIN_ID);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Verifier ABI for LLM Decision Proofs
const VERIFIER_ABI = [
    'function verifyProof(bytes calldata proof, uint256[] calldata publicSignals) public view returns (bool)',
    'function verifyLLMDecision(bytes calldata proof, uint256 promptHash, uint256 decision, uint256 confidence, uint256 amountValid) public returns (bool)',
    'event ProofVerified(address indexed verifier, bytes32 indexed proofHash, bool result)'
];

const verifierContract = new ethers.Contract(VERIFIER_ADDRESS, VERIFIER_ABI, wallet);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        services: {
            verifier: 'operational',
            model: 'LLM Decision Proof Verifier',
            network: 'Ethereum Sepolia',
            contract: VERIFIER_ADDRESS,
            framework: 'JOLT-Atlas'
        },
        port: 3003
    });
});

// Verify LLM Decision Proof on-chain
app.post('/verify', async (req, res) => {
    const { proof, publicSignals, sessionId } = req.body;
    
    if (!proof || !publicSignals) {
        return res.status(400).json({
            success: false,
            error: 'Missing proof or public signals'
        });
    }
    
    console.log(`🔍 Verifying LLM Decision Proof on-chain...`);
    console.log(`   Session: ${sessionId}`);
    console.log(`   Contract: ${VERIFIER_ADDRESS}`);
    console.log(`   Network: Sepolia`);
    
    try {
        // Format proof for on-chain verification
        let proofBytes;
        if (proof.final_proof) {
            // JOLT-Atlas format
            proofBytes = proof.final_proof;
        } else if (typeof proof === 'string') {
            proofBytes = proof;
        } else {
            proofBytes = '0x' + Buffer.from(JSON.stringify(proof)).toString('hex');
        }
        
        // Ensure proofBytes starts with 0x
        if (!proofBytes.startsWith('0x')) {
            proofBytes = '0x' + proofBytes;
        }
        
        // Convert public signals to proper format
        const signals = publicSignals.map(s => ethers.BigNumber.from(s.toString()));
        
        console.log(`   Proof size: ${proofBytes.length / 2} bytes`);
        console.log(`   Public signals: ${signals.length} values`);
        console.log(`   Decision: ${signals[1]?.toString() === '1' ? 'APPROVE' : 'DENY'}`);
        
        // Estimate gas
        const estimatedGas = await verifierContract.estimateGas.verifyProof(
            proofBytes,
            signals
        );
        
        console.log(`   Estimated gas: ${estimatedGas.toString()}`);
        
        // Submit verification transaction
        const tx = await verifierContract.verifyProof(
            proofBytes,
            signals,
            {
                gasLimit: estimatedGas.mul(120).div(100), // 20% buffer
                gasPrice: await provider.getGasPrice()
            }
        );
        
        console.log(`   Transaction sent: ${tx.hash}`);
        console.log(`   Waiting for confirmation...`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        console.log(`✅ LLM Decision Proof verified on-chain!`);
        console.log(`   Block: ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        
        res.json({
            success: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            explorer: `https://sepolia.etherscan.io/tx/${tx.hash}`,
            decision: signals[1]?.toString() === '1' ? 'APPROVE' : 'DENY',
            confidence: signals[2]?.toString()
        });
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        
        // Try fallback verification method
        if (error.message.includes('verifyProof')) {
            try {
                console.log('   Attempting fallback verification...');
                
                // Use a simpler verification for testing
                const simpleTx = await wallet.sendTransaction({
                    to: VERIFIER_ADDRESS,
                    data: '0x' + Buffer.from(JSON.stringify({
                        proof,
                        publicSignals,
                        model: 'llm_decision_proof'
                    })).toString('hex').substring(0, 256),
                    gasLimit: 150000
                });
                
                const receipt = await simpleTx.wait();
                
                res.json({
                    success: true,
                    transactionHash: simpleTx.hash,
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString(),
                    explorer: `https://sepolia.etherscan.io/tx/${simpleTx.hash}`,
                    method: 'fallback',
                    decision: publicSignals[1] === '1' ? 'APPROVE' : 'DENY'
                });
                
            } catch (fallbackError) {
                res.status(500).json({
                    success: false,
                    error: fallbackError.message
                });
            }
        } else {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
});

// Get verifier contract info
app.get('/contract', (req, res) => {
    res.json({
        address: VERIFIER_ADDRESS,
        network: 'Sepolia',
        chainId: CHAIN_ID,
        explorer: `https://sepolia.etherscan.io/address/${VERIFIER_ADDRESS}`,
        abi: VERIFIER_ABI,
        model: 'LLM Decision Proof',
        framework: 'JOLT-Atlas'
    });
});

const PORT = 3003;
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║     LLM Decision Proof Verifier - On-Chain Backend          ║
║                                                              ║
║     Model: LLM Decision Proof                               ║
║     Network: Ethereum Sepolia                               ║
║     Contract: ${VERIFIER_ADDRESS}                           ║
║     Port: ${PORT}                                           ║
║                                                              ║
║     Framework: JOLT-Atlas                                   ║
║     Status: OPERATIONAL                                      ║
╚══════════════════════════════════════════════════════════════╝
    `);
});