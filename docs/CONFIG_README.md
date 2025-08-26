# Configuration Guide for Verifiable Agent Kit

## Overview
This document explains the configuration structure and all deployed contracts for the Verifiable Agent Kit.

## Key Configuration Files

### 1. `.env` - Environment Variables
Contains sensitive API keys and credentials:
- `OPENAI_API_KEY` - For AI chat functionality
- `CIRCLE_API_KEY` - For USDC transfers
- `CIRCLE_ETH_WALLET_ID` & `CIRCLE_SOL_WALLET_ID` - Circle wallet IDs
- `PRIVATE_KEY` - MetaMask private key for deployments

### 2. `config.js` - Main Backend Configuration
Central configuration file that:
- Loads environment variables
- Defines all contract addresses
- Sets up service endpoints
- Manages feature flags

### 3. `static/js/config.js` - Frontend Configuration
Frontend-specific settings including:
- WebSocket connection details
- All blockchain contract addresses
- API endpoints

### 4. `config-complete.js` - Reference Configuration
Comprehensive configuration with all values including:
- Deployed contract addresses
- API keys (some hardcoded for reference)
- Deployment history

## Deployed Smart Contracts

### Ethereum Sepolia
- **ZK Verifier**: `0x1e8150050a7a4715aad42b905c08df76883f396f`
- **Explorer**: https://sepolia.etherscan.io/address/0x1e8150050a7a4715aad42b905c08df76883f396f

### Solana Devnet
- **Program ID**: `2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7`
- **Explorer**: https://explorer.solana.com/address/2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7?cluster=devnet

### Base Sepolia
- **ZK Verifier**: `0x74D68B2481d298F337e62efc50724CbBA68dCF8f`
- **AI Prediction Commitment**: `0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC`
- **Explorer**: 
  - ZK: https://sepolia.basescan.org/address/0x74D68B2481d298F337e62efc50724CbBA68dCF8f
  - AI: https://sepolia.basescan.org/address/0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC

## Configuration Updates

When updating configurations:

1. **Backend Changes**: Update `config.js`
2. **Frontend Changes**: Update `static/js/config.js`
3. **Contract Deployments**: Update both backend and frontend configs
4. **Environment Variables**: Update `.env` and `.env.example`

## Testing Configuration

Run the configuration test script:
```bash
node test-all-configs.js
```

This will verify:
- All environment variables are set
- Smart contracts are deployed
- WASM files exist
- Services are running
- Feature flags are configured

## Common Issues

### Issue: Transaction not found on blockchain
**Solution**: Ensure you're using the correct contract address and the transaction is real (not simulated).

### Issue: MetaMask not connecting
**Solution**: Check that the chain ID and contract addresses match in frontend config.

### Issue: Circle transfers failing
**Solution**: Verify Circle wallet IDs are correct and API key is valid.

## Feature Flags

Current features enabled:
- `enableOpenAI`: true
- `enableCircleTransfers`: true
- `enableSolana`: true
- `enableEthereum`: true
- `enableBase`: true
- `enableRealAICommitments`: true (using real Base transactions)

## API Keys

- **OpenAI**: Required for AI chat functionality
- **Circle**: Required for USDC transfers (sandbox)
- **Coinbase**: `30f1d73c-8bb7-42b6-8f5d-bb5b79b1dd4a` (for Base integration)

## Wallet Information

### MetaMask Deployment Wallet
- Address: `0xE616B2eC620621797030E0AB1BA38DA68D78351C`
- Used for: Contract deployments and transactions

### Circle Wallets
- Ethereum Wallet ID: `1017342606`
- Solana Wallet ID: `1017342622`
- Developer Wallet (UUID): `da83113b-f48f-58a3-9115-31572ebfc127`

## Last Updated
January 21, 2025 - Added real AI prediction commitment contract on Base Sepolia