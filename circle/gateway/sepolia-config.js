// Circle Gateway Sepolia Testnet Configuration
// Based on official Circle documentation

export const SEPOLIA_GATEWAY_CONFIG = {
  // Network Configuration
  network: 'ethereum-sepolia',
  chainId: 11155111,
  rpcUrl: 'https://ethereum-sepolia.publicnode.com',
  explorerUrl: 'https://sepolia.etherscan.io',
  
  // Your Wallet
  walletAddress: '0xE616B2eC620621797030E0AB1BA38DA68D78351C',
  
  // Gateway Contracts (from Circle docs)
  contracts: {
    gatewayWallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    gatewayMinter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
    domain: 0 // Ethereum domain
  },
  
  // Gateway API Configuration
  api: {
    baseUrl: 'https://gateway-api.circle.com/v1',
    endpoints: {
      info: '/info',
      balances: '/balances',
      transfer: '/transfer'
    }
  },
  
  // Demo Configuration
  demo: {
    depositAmount: '1000000', // 1 USDC (6 decimals)
    transferAmount: '10000',  // 0.01 USDC per chain
    maxDemos: 100 // 1 USDC ÷ 0.01 per demo
  },
  
  // Testnet Faucets
  faucets: {
    eth: 'https://sepoliafaucet.com/',
    usdc: 'https://faucet.circle.com/',
    backup_eth: 'https://faucet.quicknode.com/ethereum/sepolia'
  }
};

// Multi-chain Gateway Configuration
export const GATEWAY_NETWORKS = {
  ethereum: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    domain: 0,
    rpcUrl: 'https://ethereum-sepolia.publicnode.com',
    gatewayWallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    gatewayMinter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    color: '🔷',
    explorer: 'https://sepolia.etherscan.io'
  },
  base: {
    name: 'Base Sepolia',
    chainId: 84532,
    domain: 6,
    rpcUrl: 'https://sepolia.base.org',
    gatewayWallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    gatewayMinter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    color: '🟦',
    explorer: 'https://sepolia.basescan.org'
  },
  avalanche: {
    name: 'Avalanche Fuji',
    chainId: 43113,
    domain: 1,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    gatewayWallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    gatewayMinter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B',
    usdc: '0x5425890298aed601595a70ab815c96711a31bc65',
    color: '🔺',
    explorer: 'https://testnet.snowtrace.io'
  }
};

console.log('🔧 Gateway Sepolia Configuration Loaded');
console.log(`📍 Your wallet: ${SEPOLIA_GATEWAY_CONFIG.walletAddress}`);
console.log(`🌐 Network: ${SEPOLIA_GATEWAY_CONFIG.network}`);
console.log(`🏦 Gateway wallet: ${SEPOLIA_GATEWAY_CONFIG.contracts.gatewayWallet}`);
console.log(`💵 Sepolia USDC: ${SEPOLIA_GATEWAY_CONFIG.contracts.usdc}`);