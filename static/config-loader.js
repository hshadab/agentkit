/**
 * Configuration Loader for Frontend
 * Loads configuration from the server and makes it available globally
 */

(function() {
  // Default configuration for frontend
  window.APP_CONFIG = {
    // Server endpoints
    wsUrl: 'ws://localhost:8001/ws',
    apiUrl: 'http://localhost:8001',
    
    // Blockchain settings
    ethereum: {
      contractAddress: '0x1e8150050a7a4715aad42b905c08df76883f396f',
      chainId: 11155111, // Sepolia
      explorerUrl: 'https://sepolia.etherscan.io',
    },
    
    solana: {
      programId: '5VzkNtgVwarEGSLvgvvPvTNqR7qQQai2MZ7BuYNqQPhw',
      rpcUrl: 'https://api.devnet.solana.com',
      explorerUrl: 'https://explorer.solana.com',
      cluster: 'devnet',
    },
    
    // UI settings
    ui: {
      proofCardLimit: 20,
      animationDuration: 300,
      toastDuration: 3000,
      debugMode: false,
    },
    
    // Feature flags
    features: {
      enableOpenAI: true,
      enableCircleTransfers: true,
      enableSolana: true,
      enableEthereum: true,
      enableDebugPanel: false,
    },
  };

  // Override with any server-provided config
  fetch('/api/config')
    .then(response => response.json())
    .then(serverConfig => {
      Object.assign(window.APP_CONFIG, serverConfig);
      console.log('Configuration loaded:', window.APP_CONFIG);
    })
    .catch(error => {
      console.warn('Using default configuration:', error);
    });
})();