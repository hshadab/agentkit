// Circle Gateway MAINNET Configuration - Production Contracts
// Using REAL contract addresses from Gateway API

export const MAINNET_GATEWAY_CONFIG = {
  // Network Configuration
  network: 'ethereum-mainnet',
  chainId: 1,
  rpcUrl: 'https://eth-mainnet.public.blastapi.io',
  explorerUrl: 'https://etherscan.io',
  
  // Your Wallet
  walletAddress: '0xE616B2eC620621797030E0AB1BA38DA68D78351C',
  
  // PRODUCTION Gateway Contracts (from Gateway API /info)
  contracts: {
    gatewayWallet: '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE', // ⭐ REAL PRODUCTION
    gatewayMinter: '0x2222222d7164433c4C09B0b0D809a9b52C04C205', // ⭐ REAL PRODUCTION
    usdc: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // Mainnet USDC
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
  }
};

// ALL Gateway Mainnet Networks (from API)
export const GATEWAY_MAINNET_NETWORKS = {
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    domain: 0,
    rpcUrl: 'https://eth-mainnet.public.blastapi.io',
    gatewayWallet: '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE',
    gatewayMinter: '0x2222222d7164433c4C09B0b0D809a9b52C04C205',
    usdc: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    color: '🔷',
    explorer: 'https://etherscan.io'
  },
  base: {
    name: 'Base',
    chainId: 8453,
    domain: 6,
    rpcUrl: 'https://mainnet.base.org',
    gatewayWallet: '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE',
    gatewayMinter: '0x2222222d7164433c4C09B0b0D809a9b52C04C205',
    usdc: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    color: '🟦',
    explorer: 'https://basescan.org'
  },
  avalanche: {
    name: 'Avalanche',
    chainId: 43114,
    domain: 1,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    gatewayWallet: '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE',
    gatewayMinter: '0x2222222d7164433c4C09B0b0D809a9b52C04C205',
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    color: '🔺',
    explorer: 'https://snowtrace.io'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    domain: 3,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    gatewayWallet: '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE',
    gatewayMinter: '0x2222222d7164433c4C09B0b0D809a9b52C04C205',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    color: '🔵',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    domain: 2,
    rpcUrl: 'https://mainnet.optimism.io',
    gatewayWallet: '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE',
    gatewayMinter: '0x2222222d7164433c4C09B0b0D809a9b52C04C205',
    usdc: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    color: '🔴',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    domain: 7,
    rpcUrl: 'https://polygon-rpc.com',
    gatewayWallet: '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE',
    gatewayMinter: '0x2222222d7164433c4C09B0b0D809a9b52C04C205',
    usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    color: '🟣',
    explorer: 'https://polygonscan.com'
  },
  unichain: {
    name: 'Unichain',
    chainId: 1301,
    domain: 10,
    rpcUrl: 'https://rpc.unichain.org',
    gatewayWallet: '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE',
    gatewayMinter: '0x2222222d7164433c4C09B0b0D809a9b52C04C205',
    usdc: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    color: '🦄',
    explorer: 'https://unichain.org/explorer'
  }
};

console.log('🚀 Gateway MAINNET Configuration Loaded');
console.log(`📍 Your wallet: ${MAINNET_GATEWAY_CONFIG.walletAddress}`);
console.log(`🌐 Network: ${MAINNET_GATEWAY_CONFIG.network}`);
console.log(`🏦 PRODUCTION Gateway wallet: ${MAINNET_GATEWAY_CONFIG.contracts.gatewayWallet}`);
console.log(`💵 Mainnet USDC: ${MAINNET_GATEWAY_CONFIG.contracts.usdc}`);
console.log('✅ Using REAL production contracts from Gateway API!');