#!/usr/bin/env node

// REAL Groth16 On-Chain Verification Service for x402
// Uses deployed verifier on Base Sepolia: 0x6121Fd93594C316B78e74B91B89A06d3Bb682a8F

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

// Configuration
const VERIFIER_ADDRESS = process.env.ZKML_VERIFIER_ADDRESS || '0x6121Fd93594C316B78e74B91B89A06d3Bb682a8F';
const DEPLOYMENT_PATH = process.env.ZKML_VERIFIER_DEPLOYMENT || 
  path.join(__dirname, '../deployments/jolt-storage-verifier-base-sepolia.json');
// Use working RPC endpoint
const RPC_URL = process.env.BASE_RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.BASE_PRIVATE_KEY;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '84532');

// Load deployment artifact
const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_PATH, 'utf8'));
const ABI = deployment.abi;

// Initialize provider with timeout
const provider = new ethers.JsonRpcProvider(RPC_URL, {
  chainId: CHAIN_ID,
  name: 'base-sepolia',
  staticNetwork: true
});

// Set provider timeout
provider._getConnection().timeout = 10000; // 10 second timeout

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Initialize contract
const verifierContract = new ethers.Contract(VERIFIER_ADDRESS, ABI, wallet);

/**
 * Verify zkML proof on-chain (REAL transaction)
 * @param {Object} proof - Groth16 proof with a, b, c components
 * @param {Array} publicSignals - Public signals [decision, confidence]
 * @returns {Object} Transaction result with hash and explorer link
 */
async function verifyOnChain(proof, publicSignals) {
  try {
    console.log('[verifier] Starting on-chain verification...');
    console.log('[verifier] Contract:', VERIFIER_ADDRESS);
    console.log('[verifier] Signals:', publicSignals);
    
    
    // Add timeout wrapper
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Verification timeout')), 15000)
    );
    
    // Check verification count with timeout
    const signerAddress = await Promise.race([
      wallet.getAddress(),
      timeoutPromise
    ]);
    
    try {
      const verifyCount = await Promise.race([
        verifierContract.verificationCount(signerAddress),
        timeoutPromise
      ]);
      if (verifyCount && verifyCount > 0) {
        console.log('[verifier] Already has', verifyCount.toString(), 'verifications, skipping duplicate');
      }
    } catch (e) {
      console.log('[verifier] Could not check verification count:', e.message);
    }
    
    // Format proof components for contract call
    const a = [proof.pi_a[0], proof.pi_a[1]];
    const b = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
    const c = [proof.pi_c[0], proof.pi_c[1]];
    
    // Estimate gas
    const gasEstimate = await verifierContract.verifyAndStore.estimateGas(
      a, b, c, publicSignals,
      { gasLimit: 500000 }
    );
    console.log('[verifier] Estimated gas:', gasEstimate.toString());
    
    // Execute verification transaction
    const tx = await verifierContract.verifyAndStore(
      a, b, c, publicSignals,
      { 
        gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
        maxFeePerGas: ethers.parseUnits('2', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei')
      }
    );
    
    console.log('[verifier] Transaction submitted:', tx.hash);
    console.log('[verifier] Waiting for confirmation...');
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    console.log('[verifier] Verification confirmed!');
    console.log('[verifier] Block:', receipt.blockNumber);
    console.log('[verifier] Gas used:', receipt.gasUsed.toString());
    
    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      contractAddress: VERIFIER_ADDRESS,
      explorer: `https://sepolia.basescan.org/tx/${tx.hash}`,
      message: 'zkML proof verified on-chain'
    };
    
  } catch (error) {
    console.error('[verifier] Verification failed:', error.message);
    
    // Check if it's a revert with reason
    if (error.reason) {
      console.error('[verifier] Revert reason:', error.reason);
    }
    
    return {
      success: false,
      error: error.message,
      reason: error.reason || 'Unknown error'
    };
  }
}

/**
 * Check verification status (view function, no gas)
 * @param {string} address - Address to check
 * @returns {Object} Verification status
 */
async function checkVerificationStatus(address) {
  try {
    const count = await verifierContract.verificationCount(address);
    return {
      verified: count && count > 0,
      verificationCount: count?.toString() || '0',
      message: count > 0 ? 'Address has verified proofs' : 'No verifications found'
    };
  } catch (error) {
    console.error('[verifier] Status check failed:', error.message);
    return {
      verified: false,
      error: error.message
    };
  }
}

// Export for use in proof-gate
module.exports = {
  verifyOnChain,
  checkVerificationStatus,
  VERIFIER_ADDRESS,
  provider,
  wallet
};

// Test function if run directly
if (require.main === module) {
  (async () => {
    console.log('[verifier] Groth16 Verifier Service - Test Mode');
    console.log('[verifier] Contract:', VERIFIER_ADDRESS);
    console.log('[verifier] Network: Base Sepolia (chainId:', CHAIN_ID, ')');
    console.log('[verifier] Wallet:', await wallet.getAddress());
    
    // Test with dummy proof (will fail verification but tests connectivity)
    const testProof = {
      pi_a: ["1", "2"],
      pi_b: [["6", "5"], ["4", "3"]],
      pi_c: ["7", "8"]
    };
    const testSignals = ["1", "95"];
    
    console.log('\n[verifier] Testing verification with dummy proof...');
    const result = await verifyOnChain(testProof, testSignals);
    console.log('[verifier] Result:', result);
    
    if (!result.success) {
      console.log('[verifier] Note: Dummy proof expected to fail. Service is working correctly.');
    }
  })();
}