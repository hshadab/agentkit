require("@nomiclabs/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
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
    hardhat: {},
    sepolia: {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: ["c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab"],
      chainId: 11155111
    },
    "base-sepolia": {
      url: "https://sepolia.base.org",
      accounts: ["c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab"],
      chainId: 84532
    },
    "iotex-testnet": {
      url: "https://babel-api.testnet.iotex.io",
      accounts: ["c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab"],
      chainId: 4690
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};