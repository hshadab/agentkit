import dotenv from 'dotenv';
dotenv.config();

// Circle Gateway PRODUCTION contract addresses (from Circle docs)
export const GATEWAY_CONTRACTS = {
  ETH_SEPOLIA: {
    network: 'sepolia',
    chainId: 11155111,
    rpcUrl: process.env.GATEWAY_ETH_SEPOLIA_RPC || 'https://sepolia.infura.io/v3/' + process.env.INFURA_PROJECT_ID,
    gatewayWallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9', // Real Gateway Wallet
    gatewayMinter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B', // Real Gateway Minter
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC on Sepolia
    domain: 0 // Ethereum Sepolia domain
  },
  BASE_SEPOLIA: {
    network: 'base-sepolia',
    chainId: 84532,
    rpcUrl: process.env.GATEWAY_BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    gatewayWallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9', // Real Gateway Wallet
    gatewayMinter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B', // Real Gateway Minter
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
    domain: 6 // Base Sepolia domain
  },
  AVALANCHE_FUJI: {
    network: 'avalanche-fuji',
    chainId: 43113,
    rpcUrl: process.env.GATEWAY_AVALANCHE_FUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpc',
    gatewayWallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9', // Real Gateway Wallet
    gatewayMinter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B', // Real Gateway Minter
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65', // USDC on Fuji
    domain: 1 // Avalanche Fuji domain
  }
};

export const GATEWAY_CONFIG = {
  privateKey: process.env.GATEWAY_PRIVATE_KEY || process.env.PRIVATE_KEY,
  depositAmount: '10000000', // 10 USDC in 6 decimals
  transferAmount: '5000000', // 5 USDC in 6 decimals
  gasLimit: '300000',
  finalizationTimeouts: {
    ETH_SEPOLIA: 20 * 60 * 1000, // 20 minutes
    BASE_SEPOLIA: 20 * 60 * 1000, // 20 minutes
    AVALANCHE_FUJI: 30 * 1000     // 30 seconds
  },
  // Gateway API configuration (REAL working URL discovered!)
  api: {
    baseUrl: process.env.GATEWAY_API_URL || 'https://gateway-api.circle.com/v1', // REAL Gateway API URL
    endpoints: {
      balances: '/balances',
      info: '/info', 
      transfer: '/transfer'
    },
    headers: {
      'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
      'Content-Type': 'application/json'
    }
  }
};

export function getNetworkConfig(network) {
  const networkKey = network.toUpperCase().replace('-', '_');
  return GATEWAY_CONTRACTS[networkKey];
}

export function getSupportedNetworks() {
  return Object.keys(GATEWAY_CONTRACTS);
}