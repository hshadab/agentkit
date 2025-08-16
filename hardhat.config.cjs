require('dotenv').config();

// IoTeX testnet configuration
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    iotex_testnet: {
      url: "https://babel-api.testnet.iotex.io",
      chainId: 4690,
      accounts: process.env.IOTEX_PRIVATE_KEY ? [process.env.IOTEX_PRIVATE_KEY] : [],
      gas: 8500000,
      gasPrice: 1000000000000, // 1000 Gwei
    }
  }
};