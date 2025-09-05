#!/usr/bin/env node

/**
 * Base AI Prediction with Groth16 Proof Verification
 * Commit-reveal scheme for AI predictions with cryptographic proofs
 * Port: 8004
 */

const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const crypto = require('crypto');
const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8004;

// Base Sepolia configuration
const BASE_RPC = 'https://sepolia.base.org';
const CHAIN_ID = 84532;
const PRIVATE_KEY = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';

// Contract addresses on Base Sepolia
const AI_COMMITMENT_CONTRACT = '0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC';
const AI_COMMITMENT_ABI = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../contracts/AIPredictionCommitment_Base.sol'), 'utf8')
    .match(/contract\s+\w+\s*{[\s\S]*}/)[0] ? '[]' : 
    '[{"inputs":[{"name":"promptHash","type":"bytes32"},{"name":"responseHash","type":"bytes32"}],"name":"commitPrediction","outputs":[{"name":"commitmentId","type":"bytes32"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"prompt","type":"string"},{"name":"response","type":"string"},{"name":"nonce","type":"string"},{"name":"zkProof","type":"bytes"}],"name":"revealPrediction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"commitmentId","type":"bytes32"}],"name":"getCommitment","outputs":[{"name":"promptHash","type":"bytes32"},{"name":"responseHash","type":"bytes32"},{"name":"blockNumber","type":"uint256"},{"name":"timestamp","type":"uint256"},{"name":"predictor","type":"address"},{"name":"revealed","type":"bool"}],"stateMutability":"view","type":"function"},{"anonymous":false,"inputs":[{"indexed":true,"name":"commitmentId","type":"bytes32"},{"indexed":true,"name":"predictor","type":"address"},{"name":"blockNumber","type":"uint256"},{"name":"timestamp","type":"uint256"}],"name":"PredictionCommitted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"commitmentId","type":"bytes32"},{"name":"prompt","type":"string"},{"name":"response","type":"string"},{"name":"revealBlock","type":"uint256"},{"name":"commitBlock","type":"uint256"}],"name":"PredictionRevealed","type":"event"}]'
);

// Groth16 verifier on Base Sepolia
const VERIFIER_ADDRESS = '0x28F7de77C120f92ceB5E14Efab4fCA31c7ac212E';
const VERIFIER_ABI = [
    {
        "inputs": [
            { "name": "a", "type": "uint256[2]" },
            { "name": "b", "type": "uint256[2][2]" },
            { "name": "c", "type": "uint256[2]" },
            { "name": "input", "type": "uint256[1]" }
        ],
        "name": "verifyProof",
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    }
];

// Initialize provider and contracts
let provider = null;
let wallet = null;
let commitmentContract = null;
let verifierContract = null;

// Track prediction sessions
const predictionSessions = new Map();

// Paths to circuit files
const WASM_PATH = path.join(__dirname, '../circuits/AIPredictionSimple_js/AIPredictionSimple.wasm');
const ZKEY_PATH = path.join(__dirname, '../circuits/ai_simple_0000.zkey');

async function initializeProvider() {
    try {
        provider = new ethers.JsonRpcProvider(BASE_RPC, {
            chainId: CHAIN_ID,
            name: 'base-sepolia'
        });
        
        wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        // Simple ABI for commitment contract
        const simpleABI = [
            "function commitPrediction(bytes32 promptHash, bytes32 responseHash) returns (bytes32)",
            "function revealPrediction(string prompt, string response, string nonce, bytes zkProof)",
            "function getCommitment(bytes32 commitmentId) view returns (bytes32, bytes32, uint256, uint256, address, bool)",
            "event PredictionCommitted(bytes32 indexed commitmentId, address indexed predictor, uint256 blockNumber, uint256 timestamp)",
            "event PredictionRevealed(bytes32 indexed commitmentId, string prompt, string response, uint256 revealBlock, uint256 commitBlock)"
        ];
        
        commitmentContract = new ethers.Contract(AI_COMMITMENT_CONTRACT, simpleABI, wallet);
        
        const balance = await provider.getBalance(wallet.address);
        console.log(`   Wallet: ${wallet.address}`);
        console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
        
        verifierContract = new ethers.Contract(VERIFIER_ADDRESS, VERIFIER_ABI, wallet);
        console.log(`   Verifier: ${VERIFIER_ADDRESS}`);
        
        return true;
    } catch (error) {
        console.error('Failed to connect to Base:', error.message);
        throw error;
    }
}

/**
 * Generate Groth16 proof for AI prediction
 */
async function generatePredictionProof(prompt, response, nonce, commitmentHash) {
    try {
        console.log('🔧 Generating Groth16 proof for AI prediction...');
        
        // Convert strings to numbers for circuit
        const promptNum = parseInt(crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 8), 16);
        const responseNum = parseInt(crypto.createHash('sha256').update(response).digest('hex').substring(0, 8), 16);
        const nonceNum = parseInt(crypto.createHash('sha256').update(nonce).digest('hex').substring(0, 8), 16);
        
        // Calculate commitment hash as circuit expects
        const sum = BigInt(promptNum) + BigInt(responseNum) + BigInt(nonceNum);
        const computed = sum * sum;
        
        console.log('   Prompt (num):', promptNum);
        console.log('   Response (num):', responseNum);
        console.log('   Nonce (num):', nonceNum);
        console.log('   Computed hash:', computed.toString());
        
        // Prepare witness - commitmentHash is now an output, not an input
        const input = {
            prompt: promptNum.toString(),
            response: responseNum.toString(),
            nonce: nonceNum.toString()
        };
        
        // Generate witness and proof
        console.log('   Calculating witness...');
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            WASM_PATH,
            ZKEY_PATH
        );
        
        console.log('✅ Groth16 proof generated!');
        console.log('   Public signal:', publicSignals[0]);
        
        // Format proof for Solidity
        const solidityProof = {
            a: [proof.pi_a[0], proof.pi_a[1]],
            b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
            c: [proof.pi_c[0], proof.pi_c[1]],
            input: publicSignals && publicSignals.length > 0 ? publicSignals : [computed.toString()]
        };
        
        return {
            proof: solidityProof,
            publicSignals,
            computedHash: computed.toString()
        };
    } catch (error) {
        console.error('Failed to generate Groth16 proof:', error);
        throw error;
    }
}

/**
 * Health check
 */
app.get('/health', async (req, res) => {
    const healthy = provider !== null;
    res.json({
        status: healthy ? 'healthy' : 'initializing',
        service: 'base-ai-prediction-groth16',
        network: 'base-sepolia',
        chainId: CHAIN_ID,
        commitmentContract: AI_COMMITMENT_CONTRACT,
        verifierContract: VERIFIER_ADDRESS || 'Not deployed',
        wallet: wallet ? wallet.address : 'Not initialized',
        version: '1.0',
        features: ['groth16', 'commit-reveal', 'ai-predictions']
    });
});

/**
 * Step 1: Commit AI prediction
 */
app.post('/ai/commit', async (req, res) => {
    try {
        if (!provider) {
            await initializeProvider();
        }
        
        const { prompt, response } = req.body;
        
        // Generate nonce
        const nonce = crypto.randomBytes(16).toString('hex');
        
        // Create hashes for commitment
        const promptHash = ethers.keccak256(ethers.toUtf8Bytes(prompt + nonce));
        const responseHash = ethers.keccak256(ethers.toUtf8Bytes(response + nonce));
        
        console.log('📝 Committing AI prediction on Base...');
        console.log('   Prompt:', prompt.substring(0, 50) + '...');
        console.log('   Response:', response.substring(0, 50) + '...');
        console.log('   Prompt Hash:', promptHash.substring(0, 10) + '...');
        console.log('   Response Hash:', responseHash.substring(0, 10) + '...');
        
        // Commit on-chain
        const tx = await commitmentContract.commitPrediction(promptHash, responseHash);
        
        console.log('   Transaction:', tx.hash);
        console.log('   Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        // Get commitment ID from events
        let commitmentId = null;
        for (const log of receipt.logs) {
            try {
                const parsed = commitmentContract.interface.parseLog(log);
                if (parsed && parsed.name === 'PredictionCommitted') {
                    commitmentId = parsed.args[0];
                    break;
                }
            } catch (e) {}
        }
        
        console.log('✅ AI prediction committed on-chain!');
        console.log('   Commitment ID:', commitmentId);
        console.log('   Block:', receipt.blockNumber);
        console.log('   Gas Used:', receipt.gasUsed.toString());
        
        // Store session
        const sessionId = crypto.randomBytes(16).toString('hex');
        predictionSessions.set(sessionId, {
            commitmentId,
            prompt,
            response,
            nonce,
            promptHash,
            responseHash,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            timestamp: Date.now()
        });
        
        res.json({
            success: true,
            sessionId,
            commitmentId,
            promptHash,
            responseHash,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            explorerUrl: `https://sepolia.basescan.org/tx/${tx.hash}`,
            message: 'AI prediction committed on Base'
        });
        
    } catch (error) {
        console.error('❌ Failed to commit prediction:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Step 2: Generate Groth16 proof
 */
app.post('/ai/generate-proof', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = predictionSessions.get(sessionId);
        
        if (!session) {
            throw new Error('Session not found');
        }
        
        console.log('🔐 Generating Groth16 proof for AI prediction...');
        
        // Generate Groth16 proof
        const proofData = await generatePredictionProof(
            session.prompt,
            session.response,
            session.nonce,
            session.commitmentId
        );
        
        // Store proof in session
        session.proof = proofData.proof;
        session.publicSignals = proofData.publicSignals;
        session.computedHash = proofData.computedHash;
        
        res.json({
            success: true,
            proof: proofData.proof,
            publicSignals: proofData.publicSignals,
            computedHash: proofData.computedHash,
            message: 'Groth16 proof generated successfully'
        });
        
    } catch (error) {
        console.error('❌ Proof generation failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Step 3: Reveal prediction with proof
 */
app.post('/ai/reveal', async (req, res) => {
    try {
        if (!provider) {
            await initializeProvider();
        }
        
        const { sessionId } = req.body;
        const session = predictionSessions.get(sessionId);
        
        if (!session) {
            throw new Error('Session not found');
        }
        
        if (!session.proof) {
            throw new Error('Proof not generated yet');
        }
        
        console.log('📤 Revealing AI prediction on Base...');
        console.log('   This will prove the prediction was made before the outcome');
        
        // First verify proof on-chain with Groth16 verifier
        console.log('🔐 Verifying Groth16 proof on-chain...');
        const isValid = await verifierContract.verifyProof(
            session.proof.a,
            session.proof.b,
            session.proof.c,
            session.proof.input
        );
        
        if (!isValid) {
            throw new Error('Groth16 proof verification failed');
        }
        
        console.log('✅ Groth16 proof verified on-chain!');
        
        // Encode proof for contract
        const proofBytes = ethers.AbiCoder.defaultAbiCoder().encode(
            ['uint256[2]', 'uint256[2][2]', 'uint256[2]', 'uint256[1]'],
            [session.proof.a, session.proof.b, session.proof.c, session.proof.input]
        );
        
        // Reveal on-chain
        const tx = await commitmentContract.revealPrediction(
            session.prompt,
            session.response,
            session.nonce,
            proofBytes
        );
        
        console.log('   Transaction:', tx.hash);
        console.log('   Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        console.log('✅ AI prediction revealed on-chain!');
        console.log('   Block:', receipt.blockNumber);
        console.log('   Gas Used:', receipt.gasUsed.toString());
        
        res.json({
            success: true,
            revealed: true,
            prompt: session.prompt,
            response: session.response,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            explorerUrl: `https://sepolia.basescan.org/tx/${tx.hash}`,
            message: 'AI prediction revealed with Groth16 proof'
        });
        
    } catch (error) {
        console.error('❌ Reveal failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, async () => {
    console.log('🤖 Base AI Prediction with Groth16 Verification');
    console.log(`   Port: ${PORT}`);
    console.log(`   Network: Base Sepolia`);
    console.log(`   Commitment Contract: ${AI_COMMITMENT_CONTRACT}`);
    console.log(`   Verifier Contract: ${VERIFIER_ADDRESS || 'Not deployed'}`);
    console.log(`   Version: 1.0 - REAL Groth16 Proofs`);
    console.log(`   Explorer: https://sepolia.basescan.org`);
    
    try {
        await initializeProvider();
        console.log('   ✅ Connected to Base!');
    } catch (error) {
        console.log('   ⚠️ Connection pending, will retry on first request');
    }
    
    console.log('\n📊 Available Endpoints:');
    console.log('   POST /ai/commit - Commit AI prediction on-chain');
    console.log('   POST /ai/generate-proof - Generate Groth16 proof');
    console.log('   POST /ai/reveal - Reveal prediction with proof\n');
    
    console.log('✨ This version features:');
    console.log('   • Commit-reveal scheme for AI predictions');
    console.log('   • REAL Groth16 proof generation');
    console.log('   • On-chain commitment and revelation');
    console.log('   • Temporal proof of prediction\n');
});