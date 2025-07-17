/**
 * Centralized Configuration for Agentkit
 * This file consolidates all configuration settings from various sources
 */

const path = require('path');
require('dotenv').config();

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 8001,
    host: process.env.HOST || 'localhost',
    wsUrl: process.env.WS_URL || 'ws://localhost:8001/ws',
  },

  // AI Service Configuration
  ai: {
    chatServiceUrl: process.env.CHAT_SERVICE_URL || 'http://localhost:8002',
    chatServicePort: process.env.CHAT_SERVICE_PORT || 8002,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4',
  },

  // Blockchain Configuration
  blockchain: {
    ethereum: {
      network: process.env.ETH_NETWORK || 'sepolia',
      rpcUrl: process.env.ETH_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_KEY',
      contractAddress: '0x1e8150050a7a4715aad42b905c08df76883f396f',
      chainId: 11155111, // Sepolia
      explorerUrl: 'https://sepolia.etherscan.io',
    },
    solana: {
      network: process.env.SOL_NETWORK || 'devnet',
      rpcUrl: process.env.SOL_RPC_URL || 'https://api.devnet.solana.com',
      programId: '2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7',
      commitment: 'confirmed',
      explorerUrl: 'https://explorer.solana.com',
    },
  },

  // Circle API Configuration
  circle: {
    apiKey: process.env.CIRCLE_API_KEY,
    apiUrl: process.env.CIRCLE_API_URL || 'https://api-sandbox.circle.com/v1',
    ethWalletId: process.env.CIRCLE_ETH_WALLET_ID,
    solWalletId: process.env.CIRCLE_SOL_WALLET_ID,
    usdcTokenId: process.env.CIRCLE_USDC_TOKEN_ID || '2552c76e-860a-47c8-a6d1-a20ba3e59334',
    pollInterval: 5000, // 5 seconds
    maxRetries: 3,
  },

  // zkEngine Configuration
  zkengine: {
    binaryPath: process.env.ZKENGINE_BINARY || './zkengine_binary/zkEngine',
    wasmDir: process.env.WASM_DIR || './zkengine_binary',
    proofsDir: process.env.PROOFS_DIR || './proofs',
    defaultStepSize: 50,
    proofTypes: {
      kyc: 'prove_kyc.wat',
      location: 'prove_location.wat',
      ai_content: 'prove_ai_content.wat',
    },
  },

  // Database Configuration
  database: {
    proofsDb: process.env.PROOFS_DB || './proofs_db.json',
    verificationsDb: process.env.VERIFICATIONS_DB || './verifications_db.json',
    workflowHistory: process.env.WORKFLOW_HISTORY || './workflow_history.json',
  },

  // Frontend Configuration
  frontend: {
    title: 'Novanet - Verifiable Agent Kit',
    maxProofSize: 20 * 1024 * 1024, // 20MB
    proofCardLimit: 20,
    animationDuration: 300,
    toastDuration: 3000,
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    debugMode: process.env.DEBUG_MODE === 'true',
  },

  // Security Configuration
  security: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFileTypes: ['.wat', '.wasm'],
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  },

  // Feature Flags
  features: {
    enableOpenAI: process.env.ENABLE_OPENAI !== 'false',
    enableCircleTransfers: process.env.ENABLE_CIRCLE !== 'false',
    enableSolana: process.env.ENABLE_SOLANA !== 'false',
    enableEthereum: process.env.ENABLE_ETHEREUM !== 'false',
    enableDebugPanel: process.env.ENABLE_DEBUG_PANEL === 'true',
  },

  // Development Configuration
  development: {
    hotReload: process.env.NODE_ENV !== 'production',
    mockProofs: process.env.MOCK_PROOFS === 'true',
    skipBlockchainVerification: process.env.SKIP_BLOCKCHAIN === 'true',
  },
};

// Helper function to validate configuration
function validateConfig() {
  const required = [
    ['ai.openaiApiKey', config.ai.openaiApiKey],
    ['circle.apiKey', config.circle.apiKey],
    ['circle.ethWalletId', config.circle.ethWalletId],
    ['circle.solWalletId', config.circle.solWalletId],
  ];

  const missing = required.filter(([name, value]) => !value);
  
  if (missing.length > 0) {
    console.warn('⚠️  Missing required configuration:');
    missing.forEach(([name]) => console.warn(`   - ${name}`));
    console.warn('   Please check your .env file');
  }

  return missing.length === 0;
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = { config, validateConfig };
} else {
  // Browser
  window.appConfig = config;
}