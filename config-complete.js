/**
 * Complete Configuration for Verifiable Agent Kit
 * This file contains ALL contract addresses, API keys, and wallet configurations
 * Last Updated: January 21, 2025
 */

module.exports = {
  // 1. BLOCKCHAIN CONTRACTS - ON-CHAIN VERIFICATION
  contracts: {
    // Ethereum Sepolia - ZK Proof Verification
    ethereum: {
      network: 'sepolia',
      chainId: 11155111,
      rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
      verifierContract: '0x1e8150050a7a4715aad42b905c08df76883f396f', // Deployed
      alternativeVerifier: '0x09378444046d1ccb32ca2d5b44fab6634738d067', // Also deployed
      explorerUrl: 'https://sepolia.etherscan.io'
    },
    
    // Solana Devnet - ZK Proof Verification
    solana: {
      network: 'devnet',
      rpcUrl: 'https://api.devnet.solana.com',
      programId: '2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7', // Deployed
      commitment: 'confirmed',
      explorerUrl: 'https://explorer.solana.com',
      // Wallet configuration
      wallets: {
        preferred: 'Solflare', // User's preferred wallet
        supported: ['Solflare', 'Phantom', 'Backpack'],
        solflareWallet: process.env.SOLFLARE_WALLET_ADDRESS || null // Optional specific address
      }
    },
    
    // Base Sepolia - Multiple Contracts
    base: {
      network: 'sepolia',
      chainId: 84532,
      chainIdHex: '0x14a34',
      rpcUrl: 'https://sepolia.base.org',
      contracts: {
        // ZK Proof Verifier (Groth16)
        zkVerifier: '0x74D68B2481d298F337e62efc50724CbBA68dCF8f', // Deployed
        
        // AI Prediction Commitment Contract (NEW!)
        aiPredictionCommitment: '0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC', // Deployed Jan 21, 2025
      },
      explorerUrl: 'https://sepolia.basescan.org'
    }
  },
  
  // 2. CIRCLE API - USDC TRANSFERS
  circle: {
    // API Credentials
    apiKey: process.env.CIRCLE_API_KEY, // From .env
    apiUrl: 'https://api-sandbox.circle.com/v1',
    
    // Wallet IDs (Integer format for regular wallets)
    wallets: {
      ethereum: process.env.CIRCLE_ETH_WALLET_ID, // From .env
      solana: process.env.CIRCLE_SOL_WALLET_ID,   // From .env
      
      // Developer-controlled wallet (UUID format - different API)
      developerWallet: {
        walletId: 'da83113b-f48f-58a3-9115-31572ebfc127',
        address: '0x37b6c846ca0483a0fc6c7702707372ebcd131188',
        blockchain: 'ETH-SEPOLIA',
        walletSetId: '7d0b7bbd-fac8-5de7-af8a-1f11d92be7f9'
      }
    },
    
    // USDC Token ID (Sandbox)
    usdcTokenId: '2552c76e-860a-47c8-a6d1-a20ba3e59334',
    
    // Entity Secret (for developer wallets)
    entitySecret: process.env.CIRCLE_ENTITY_SECRET || 'c5729c5ef63ce6fbf04daa0eb7479403342a7d0ac123abb2fc9ba38969c692ac'
  },
  
  // 3. AI SERVICES
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY, // From .env
      model: 'gpt-4',
      chatServiceUrl: 'http://localhost:8002',
      chatServicePort: 8002
    },
    
    // Coinbase Developer Platform
    coinbase: {
      apiKey: '30f1d73c-8bb7-42b6-8f5d-bb5b79b1dd4a' // Your provided API key
    }
  },
  
  // 4. METAMASK / WEB3 WALLET
  wallet: {
    privateKey: process.env.PRIVATE_KEY, // From .env - for deployments
    address: '0xE616B2eC620621797030E0AB1BA38DA68D78351C', // Your deployment wallet
    networks: {
      ethereum: {
        chainId: 11155111,
        name: 'Ethereum Sepolia'
      },
      base: {
        chainId: 84532,
        chainIdHex: '0x14a34',
        name: 'Base Sepolia'
      }
    }
  },
  
  // 5. ZKENGINE CONFIGURATION
  zkEngine: {
    binaryPath: './zkengine_binary/zkEngine',
    wasmDir: './zkengine_binary',
    proofsDir: './proofs',
    proofTypes: {
      kyc: 'kyc_compliance_real.wasm',
      location: 'depin_location_real.wasm',
      ai_content: 'ai_prediction_commitment.wasm' // Updated for real AI predictions
    }
  },
  
  // 6. SERVER CONFIGURATION
  server: {
    port: process.env.PORT || 8001,
    host: 'localhost',
    wsUrl: 'ws://localhost:8001/ws'
  },
  
  // 7. DEPLOYMENT HISTORY
  deployments: {
    base: {
      aiPredictionCommitment: {
        address: '0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC',
        deploymentTx: '0x0882c7ae13c3b22fc8beeed1521b1615ed2028e3966c6e1e4d4e797141f32bd0',
        deploymentBlock: 28645155,
        deploymentTime: '2025-07-21T00:39:25.436Z',
        deployer: '0xE616B2eC620621797030E0AB1BA38DA68D78351C'
      }
    }
  },
  
  // 8. FEATURE FLAGS
  features: {
    realAICommitments: true,  // Now using real Base transactions!
    circleTransfers: true,
    ethereumVerification: true,
    solanaVerification: true,
    baseVerification: true
  }
};

// Helper to get all contract addresses
function getAllContractAddresses() {
  return {
    ethereum: {
      verifier: module.exports.contracts.ethereum.verifierContract
    },
    solana: {
      programId: module.exports.contracts.solana.programId
    },
    base: {
      zkVerifier: module.exports.contracts.base.contracts.zkVerifier,
      aiPredictionCommitment: module.exports.contracts.base.contracts.aiPredictionCommitment
    }
  };
}

// Helper to check if all required env vars are set
function checkEnvVars() {
  const required = [
    'PRIVATE_KEY',
    'CIRCLE_API_KEY',
    'CIRCLE_ETH_WALLET_ID',
    'CIRCLE_SOL_WALLET_ID',
    'OPENAI_API_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('⚠️  Missing environment variables:', missing.join(', '));
    return false;
  }
  
  return true;
}

module.exports.getAllContractAddresses = getAllContractAddresses;
module.exports.checkEnvVars = checkEnvVars;