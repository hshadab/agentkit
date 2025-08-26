# Quick Circle Wallet Setup Guide

## Current Issue
Your `.env` file has placeholder values: `your_ethereum_wallet_id_here`
Circle needs **integer wallet IDs** for standard blockchain wallets.

## Immediate Steps to Get USDC Transfers Working

### Option 1: Create New Blockchain Wallets (Recommended)
1. Go to: https://app-sandbox.circle.com/
2. Log in with your Circle sandbox account
3. Navigate to "Wallets" → "Add a Wallet"
4. Select "End User Wallets" (NOT Developer Controlled)
5. Create two wallets:
   - One for **Ethereum (Sepolia)**
   - One for **Solana (Devnet)**
6. Note the **integer wallet IDs** (e.g., 1000123456)

### Option 2: Find Your Previous Wallet IDs
Since you've made successful transfers before from address `0x75C0c372da875a4Fc78E8A37f58618a6D18904e8`, check if you have:
- Previous `.env` backups
- Notes with wallet IDs
- Circle dashboard history

## Update Your Configuration

Once you have the wallet IDs, update your `.env`:

```env
# Replace with your actual integer wallet IDs
CIRCLE_ETH_WALLET_ID=1000123456
CIRCLE_SOL_WALLET_ID=1000123457
```

## Test Your Setup

Run the test transfer:
```bash
node test-transfer.js
```

## Important Notes
- Wallet IDs must be **integers** (not UUIDs)
- Each wallet needs USDC balance to send transfers
- Fund wallets through Circle dashboard if needed

Your transfer code is working perfectly - it just needs valid wallet IDs!