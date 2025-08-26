# Blockchain Deployment Guide

This guide covers deploying smart contracts to all supported blockchains.

## Supported Networks

1. **Ethereum Sepolia** - Main testnet
2. **Base Sepolia** - Layer 2 testnet
3. **Avalanche Fuji** - C-Chain testnet
4. **IoTeX Testnet** - IoT-focused chain
5. **Solana Devnet** - High-performance chain

## Prerequisites

- Node.js and npm installed
- Wallet with testnet tokens
- Private key in `.env` file

## Deployment Steps

### 1. Ethereum Sepolia

```bash
# Get test ETH from faucet
# https://sepoliafaucet.com/

# Deploy
npx hardhat run scripts/deploy.js --network sepolia

# Verify
npx hardhat verify --network sepolia DEPLOYED_ADDRESS
```

### 2. Base Sepolia

```bash
# Get test ETH from faucet
# https://faucet.quicknode.com/base/sepolia

# Deploy
npx hardhat run scripts/deploy.js --network baseSepolia

# Verify on BaseScan
npx hardhat verify --network baseSepolia DEPLOYED_ADDRESS
```

### 3. Avalanche Fuji

```bash
# Get test AVAX from faucet
# https://faucets.chain.link/fuji

# Deploy
npx hardhat run scripts/deploy-avalanche.js --network avalanche_fuji

# Contract addresses:
# - zkVerifier: 0x30e93E8B0804fD60b0d151F724c307c61Be37EE1
# - medicalIntegrity: 0x1698ebB10e789EebE7A66bDb096F0a65ce49Dc68
```

### 4. IoTeX Testnet

```bash
# Get test IOTX from faucet
# https://faucet.iotex.io/

# Deploy
npx hardhat run scripts/deploy-iotex.js --network iotex

# Contract addresses:
# - deviceVerifier: 0xd3778e76ce0131762337464EEF1BAefFc608e8e0
# - novaDecider: 0x4EF6152c952dA7A27bb57E8b989348a73aB850d2
```

### 5. Solana Devnet

```bash
# Get test SOL
solana airdrop 2

# Build program
anchor build

# Deploy
anchor deploy

# Program ID: 2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7
```

## Configuration

After deployment, update `/config/index.js` with your contract addresses:

```javascript
networks: {
  ethereum: {
    contracts: {
      verifier: 'YOUR_DEPLOYED_ADDRESS'
    }
  },
  // ... other networks
}
```

## Verification

1. Check deployment on block explorer
2. Test with a simple proof verification
3. Update frontend configuration
4. Run integration tests

## Troubleshooting

- **Insufficient funds**: Get more testnet tokens from faucets
- **Gas errors**: Increase gas price in hardhat config
- **Verification fails**: Ensure constructor arguments match
- **Wrong network**: Double-check network configuration

## Faucet Links

- [Ethereum Sepolia](https://sepoliafaucet.com/)
- [Base Sepolia](https://faucet.quicknode.com/base/sepolia)
- [Avalanche Fuji](https://faucets.chain.link/fuji)
- [IoTeX Testnet](https://faucet.iotex.io/)
- [Solana Devnet](https://faucet.solana.com/)