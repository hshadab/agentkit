// Centralized configuration for AgentKit
// This file consolidates all configuration from multiple sources

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  // Service configuration
  services: {
    rust: {
      port: process.env.PORT || 8001,
      websocket: {
        url: process.env.WS_URL || 'ws://localhost:8001/ws',
        reconnectDelay: 3000,
        maxReconnectAttempts: 10
      }
    },
    python: {
      port: process.env.CHAT_SERVICE_PORT || 8002,
      url: process.env.CHAT_SERVICE_URL || 'http://localhost:8002'
    }
  },

  // API configuration
  api: {
    openai: {
      key: process.env.OPENAI_API_KEY
    },
    circle: {
      key: process.env.CIRCLE_API_KEY,
      wallets: {
        ethereum: process.env.CIRCLE_ETH_WALLET_ID,
        solana: process.env.CIRCLE_SOL_WALLET_ID
      },
      developerWallet: {
        walletId: 'da83113b-f48f-58a3-9115-31572ebfc127',
        address: '0x37b6c846ca0483a0fc6c7702707372ebcd131188'
      }
    },
    coinbase: {
      key: process.env.COINBASE_API_KEY || '30f1d73c-8bb7-42b6-8f5d-bb5b79b1dd4a'
    }
  },

  // zkEngine configuration
  zkEngine: {
    binaryPath: process.env.ZKENGINE_BINARY || './zkengine_binary/zkEngine'
  },

  // Blockchain networks configuration
  networks: {
    ethereum: {
      name: 'Ethereum Sepolia',
      chainId: '0xaa36a7',
      chainIdDecimal: 11155111,
      rpcUrl: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID || ''}`,
      contracts: {
        verifier: '0x09378444046d1ccb32ca2d5b44fab6634738d067'
      },
      explorerUrl: 'https://sepolia.etherscan.io'
    },
    base: {
      name: 'Base Sepolia',
      chainId: '0x14a34',
      chainIdDecimal: 84532,
      rpcUrl: 'https://sepolia.base.org',
      gasPrice: 1000000000, // 1 gwei
      contracts: {
        zkVerifier: '0x74D68B2481d298F337e62efc50724CbBA68dCF8f',
        aiPredictionCommitment: '0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC'
      },
      explorerUrl: 'https://sepolia.basescan.org'
    },
    avalanche: {
      name: 'Avalanche Fuji Testnet',
      chainId: '0xa869',
      chainIdDecimal: 43113,
      rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
      contracts: {
        zkVerifier: '0x30e93E8B0804fD60b0d151F724c307c61Be37EE1',
        medicalIntegrity: '0x1698ebB10e789EebE7A66bDb096F0a65ce49Dc68'
      },
      explorerUrl: 'https://testnet.snowtrace.io'
    },
    iotex: {
      name: 'IoTeX Testnet',
      chainId: '0x1252',
      chainIdDecimal: 4690,
      rpcUrl: 'https://babel-api.testnet.iotex.io',
      gasPrice: 1000000000, // 1 gwei
      contracts: {
        deviceVerifier: '0x5967d15c7a6fD3ef7F1f309e766f35252a9de10d',
        novaDecider: '0x4EF6152c952dA7A27bb57E8b989348a73aB850d2',
        ioIDRegistry: '0x0A7e595C7889dF3652A19aF52C18377bF17e027D',
        ioID: '0x45Ce3E6f526e597628c73B731a3e9Af7Fc32f5b7'
      },
      explorerUrl: 'https://testnet.iotexscan.io',
      nativeCurrency: {
        name: 'IOTX',
        symbol: 'IOTX',
        decimals: 18
      }
    },
    solana: {
      name: 'Solana Devnet',
      network: 'devnet',
      verifierProgramId: '2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7',
      explorerUrl: 'https://explorer.solana.com',
      wallets: {
        preferred: 'Solflare',
        supported: ['Solflare', 'Phantom', 'Backpack']
      }
    }
  },

  // UI configuration
  ui: {
    messageHistoryLimit: 100,
    debugMode: process.env.NODE_ENV !== 'production',
    toastDuration: 3000,
    polling: {
      workflowInterval: 2000,
      transferInterval: 3000,
      maxPollingDuration: 300000 // 5 minutes
    }
  },

  // Private keys (only for deployment - NEVER commit these)
  privateKeys: {
    avalanche: process.env.AVALANCHE_PRIVATE_KEY,
    iotex: process.env.IOTEX_PRIVATE_KEY,
    default: process.env.PRIVATE_KEY
  },

  // Helper function to get network config by chain ID
  getNetworkByChainId(chainId) {
    const chainIdNum = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
    return Object.values(this.networks).find(n => n.chainIdDecimal === chainIdNum);
  },

  // Helper function to get RPC URL for hardhat
  getHardhatNetworks() {
    const hardhatNetworks = {};
    
    for (const [key, network] of Object.entries(this.networks)) {
      if (network.rpcUrl) {
        hardhatNetworks[key] = {
          url: network.rpcUrl,
          chainId: network.chainIdDecimal,
          accounts: this.privateKeys.default ? [this.privateKeys.default] : [],
          ...(network.gasPrice && { gasPrice: network.gasPrice })
        };
      }
    }
    
    return hardhatNetworks;
  }
};

// Export both CommonJS and ES modules
module.exports = config;
module.exports.default = config;