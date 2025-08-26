# Circle Integration Guide - Verifiable Agent Kit

## Current Situation

You have:
1. ✅ Circle Sandbox API Key configured
2. ✅ A merchant wallet (ID: 1017339334) - can only hold USD
3. ❌ No blockchain wallets for USDC transfers

## Two Types of Circle Wallets

### 1. Regular Wallets (Current Implementation)
- **Format**: Integer IDs (e.g., `1017339334`)
- **Types**: 
  - Merchant wallets - hold USD
  - Blockchain wallets - hold USDC on specific chains
- **Used by**: Current codebase (`circleHandler.js`)

### 2. Developer-Controlled Wallets
- **Format**: UUID (e.g., `da83113b-f48f-58a3-9115-31572ebfc127`)
- **Features**: Programmable, wallet sets, entity secrets
- **Found in**: `wallet-info.json` (but not used by current code)
- **Requires**: Different SDK and implementation

## What You Need

For USDC transfers to work, you need **blockchain wallets** (not merchant wallets):

1. **Ethereum Blockchain Wallet** - for Sepolia USDC
2. **Solana Blockchain Wallet** - for Devnet USDC

## How to Create Blockchain Wallets

### Option 1: Circle Sandbox Dashboard (Easiest)
1. Go to https://app-sandbox.circle.com/
2. Navigate to Wallets
3. Click "Create Wallet"
4. Select type: **Blockchain Wallet**
5. Select chain: **Ethereum** or **Solana**
6. Note the integer wallet ID

### Option 2: Use Existing Developer Wallet
The `wallet-info.json` shows a developer wallet was created, but:
- It uses a different API key
- It requires developer-controlled wallet SDK implementation
- Current code doesn't support this format

## Configuration

Once you have blockchain wallets, update `.env`:

```env
CIRCLE_ETH_WALLET_ID=123456789  # Integer ID from Circle dashboard
CIRCLE_SOL_WALLET_ID=987654321  # Integer ID from Circle dashboard
```

## Verification

Run these commands to verify:
```bash
# Check wallet configuration
python check_circle_setup.py

# Find available wallets
node circle/find-blockchain-wallets.js
```

## Important Notes

1. **Merchant vs Blockchain**: 
   - Merchant wallet (1017339334) = USD only
   - Blockchain wallets = USDC on-chain

2. **Wallet Addresses**:
   - From transaction: `0x75C0c372da875a4Fc78E8A37f58618a6D18904e8`
   - This is likely a Circle blockchain wallet address

3. **Test Recipients**:
   - alice: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
   - bob: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`

## Alternative: Implement Developer Wallets

If you want to use the developer wallet from `wallet-info.json`:
1. Implement Circle's developer-controlled wallets SDK
2. Use the entity secret and wallet set ID
3. Modify the code to handle UUID wallet IDs

For now, the easiest path is creating regular blockchain wallets in the Circle dashboard.