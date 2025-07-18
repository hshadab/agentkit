# Circle API Setup - Complete Guide

This guide documents the complete Circle API setup process for USDC transfers in the Verifiable Agent Kit.

## Table of Contents
- [Overview](#overview)
- [Key Discoveries](#key-discoveries)
- [Setup Process](#setup-process)
- [API Endpoints](#api-endpoints)
- [Wallet Types](#wallet-types)
- [Common Issues & Solutions](#common-issues--solutions)
- [Testing Transfers](#testing-transfers)

## Overview

Circle's sandbox environment allows you to create wallets and perform USDC transfers programmatically. The key insight is that **Circle automatically converts USD to USDC for blockchain transfers**, eliminating the need for manual USDC funding in the sandbox.

## Key Discoveries

### 1. Automatic USD to USDC Conversion
- Circle sandbox wallets can hold USD balance
- When initiating blockchain transfers, Circle automatically converts USD to USDC
- No need to manually add or convert to USDC

### 2. Wallet Creation via API
- The `POST /v1/wallets` endpoint creates blockchain wallets
- Only requires an `idempotencyKey` parameter
- Returns integer wallet IDs (e.g., `1017342606`)

### 3. Address Discrepancies
- API-returned addresses vs Dashboard addresses may differ
- Dashboard shows deposit addresses for receiving external USDC
- API addresses are for internal operations

## Setup Process

### Step 1: Create Circle Sandbox Account
1. Go to https://app-sandbox.circle.com/
2. Sign up for a sandbox account
3. Get your API key (format: `SAND_API_KEY:xxx:xxx`)

### Step 2: Configure Environment Variables
```env
# Circle API Configuration
CIRCLE_API_KEY=SAND_API_KEY:your-api-key-here:your-secret-here
CIRCLE_ETH_WALLET_ID=your-eth-wallet-id
CIRCLE_SOL_WALLET_ID=your-sol-wallet-id
```

### Step 3: Create Wallets Programmatically
Run the wallet creation script:
```bash
node circle/create-wallets-api.js
```

This script:
- Creates Ethereum and Solana wallets
- Generates blockchain addresses automatically
- Returns integer wallet IDs to add to your `.env`

### Step 4: Fund Wallets
Transfer USD from your merchant wallet to the new wallets:
```bash
node circle/fund-wallets.js
```

## API Endpoints

### Create Wallet
```javascript
POST /v1/wallets
{
  "idempotencyKey": "unique-key-here"
}
```

### Create Blockchain Address
```javascript
POST /v1/wallets/{walletId}/addresses
{
  "idempotencyKey": "unique-key-here",
  "currency": "USD",
  "chain": "ETH" // or "SOL"
}
```

### Create Transfer
```javascript
POST /v1/transfers
{
  "idempotencyKey": "unique-key-here",
  "source": {
    "type": "wallet",
    "id": "wallet-id"
  },
  "destination": {
    "type": "blockchain",
    "address": "0x...",
    "chain": "ETH"
  },
  "amount": {
    "amount": "0.01",
    "currency": "USD"
  }
}
```

## Wallet Types

### 1. Merchant Wallet
- Type: `merchant`
- Can hold USD and send to blockchain addresses
- Automatically converts USD to USDC for transfers
- Example ID: `1017339334`

### 2. End User Wallet
- Type: `end_user_wallet`
- Created via API for blockchain operations
- Can hold USD and perform blockchain transfers
- Example ID: `1017342606`

### 3. Developer-Controlled Wallet
- Type: Uses UUID format (e.g., `da83113b-f48f-58a3-9115-31572ebfc127`)
- Requires entity secret and different API endpoints
- Not needed for basic USDC transfers

## Common Issues & Solutions

### Issue 1: "The wallet id is not a parsable integer"
**Cause**: Using placeholder values like `your_ethereum_wallet_id_here`
**Solution**: Create wallets via API or dashboard to get real integer IDs

### Issue 2: "insufficient_funds" error
**Cause**: Wallet has no balance (USD or USDC)
**Solution**: Transfer USD from merchant wallet or add funds via dashboard

### Issue 3: Different addresses in API vs Dashboard
**Explanation**: 
- API shows internal operation addresses
- Dashboard shows deposit addresses for receiving external funds
- Both are valid for their respective purposes

### Issue 4: Can't find "Add USDC" button
**Explanation**: Circle sandbox automatically converts USD to USDC during transfers
**Solution**: Just add USD to your wallet; it converts automatically

## Testing Transfers

### Quick Test Script
```javascript
// test-transfer.js
import { transferUSDC } from './circle/circleHandler.js';

const result = await transferUSDC(
    0.01,                                    // amount
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // recipient
    'ETH'                                    // blockchain
);
```

### Using the CLI
```bash
# Natural language transfer
node circle/executeTransfer.js "send 0.05 USDC to alice on ethereum"

# Check wallet balances
node circle/check-wallet-balance.js
```

### Monitoring Transfers
1. Check transfer status via API
2. View on blockchain explorers:
   - Ethereum: https://sepolia.etherscan.io/tx/{txHash}
   - Solana: https://explorer.solana.com/tx/{txHash}?cluster=devnet

## Important Notes

1. **Sandbox Limitations**: Test environment only; not for production
2. **Automatic Conversion**: USD automatically converts to USDC for blockchain transfers
3. **Balance Requirements**: Ensure sufficient USD balance before transfers
4. **Transfer Time**: Blockchain transfers may take 10-60 seconds
5. **Error Handling**: Check transfer status for success/failure

## Utility Scripts

### create-wallets-api.js
Creates new blockchain wallets via Circle API

### fund-wallets.js
Transfers USD from merchant wallet to blockchain wallets

### check-wallet-balance.js
Shows current balances and addresses for all wallets

### test-transfer.js
Tests USDC transfer functionality

## Support

For issues or questions:
1. Check Circle's documentation: https://developers.circle.com/
2. Review error messages carefully - they're usually descriptive
3. Ensure your API key is valid and has correct permissions
4. Verify wallet IDs are integers, not placeholders