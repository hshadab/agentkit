# Ethereum Contract Deployment Guide

This guide will help you deploy the SimplifiedZKVerifier contract to Sepolia testnet.

## Prerequisites

1. **Ethereum Wallet** (Phantom or MetaMask) with:
   - A wallet address with some Sepolia ETH
   - Your private key exported
   - Note: Phantom wallet supports Ethereum networks!

2. **Infura Account** (free):
   - Sign up at https://infura.io/
   - Create a new project
   - Get your API key

3. **Etherscan Account** (optional, for verification):
   - Sign up at https://etherscan.io/
   - Get your API key from https://etherscan.io/myapikey

## Step 1: Get Sepolia ETH

You need test ETH to deploy contracts. Get free Sepolia ETH from:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://sepolia-faucet.pk910.de/

## Step 2: Configure Environment Variables

Edit the `.env` file and replace the placeholders:

```bash
# Replace with your Infura project ID
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_ACTUAL_INFURA_PROJECT_ID

# Replace with your wallet's private key (without 0x prefix)
DEPLOYER_PRIVATE_KEY=your_private_key_here

# Optional: For contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**IMPORTANT**: Never share your private key! Keep the `.env` file secure.

## Step 3: Deploy the Contract

Run the deployment script:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

This will:
1. Compile the SimplifiedZKVerifier contract
2. Deploy it to Sepolia testnet
3. Save the deployment info to `deployment-sepolia.json`
4. Automatically update `ethereum-verifier.js` with the contract address

## Step 4: Verify the Contract (Optional)

After deployment, verify your contract on Etherscan:

```bash
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS
```

## Step 5: Test the Integration

1. Start your local server:
   ```bash
   cargo run
   ```

2. Open the UI at http://localhost:8001

3. Generate a proof (KYC, Location, or AI Content)

4. Click "🔗 Verify on Ethereum" to test on-chain verification

## Estimated Costs

- Deployment: ~0.001-0.002 ETH (~$2-4 at current prices)
- Each verification: ~0.0001-0.0002 ETH (~$0.20-0.40)

## Troubleshooting

### "Insufficient balance" error
- Make sure your wallet has Sepolia ETH
- Check the wallet address matches the private key

### "Invalid private key" error
- Ensure the private key is 64 characters (without 0x prefix)
- Double-check you copied it correctly

### "Network error" 
- Verify your Infura API key is correct
- Check your internet connection

## Current Implementation Status

The deployed contract includes:
- Simplified Groth16 proof verification
- Support for KYC, Location, and AI Content proofs
- On-chain storage of verification results
- Event emission for tracking

Note: This is a demo implementation. For production use, you would need:
- Real Groth16 verification using bn128 precompiles
- Proper proof serialization from Nova format
- Gas optimization (current cost would be ~2-5M gas for real verification)