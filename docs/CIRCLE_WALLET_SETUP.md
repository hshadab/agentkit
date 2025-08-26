# Circle Wallet Setup Guide

## How Circle Wallets Work

### Key Concept: USD → USDC Conversion is Automatic

**IMPORTANT**: You do NOT need USDC in your Circle wallets. You need USD. Circle automatically converts USD to USDC when sending to blockchain addresses.

### Current Setup (Working Configuration)

Based on your current configuration:
- **Ethereum Wallet** (1017342606): Holds USD, sends USDC to Ethereum addresses
- **Solana Wallet** (1017342622): Holds USD, sends USDC to Solana addresses
- **Merchant Wallet** (1017339334): Can only hold USD, cannot send to blockchains

## Required Wallet Types

Based on the working examples:
- **Ethereum Wallet**: For USDC transfers on Ethereum Sepolia
- **Solana Wallet**: For USDC transfers on Solana Devnet

## How to Create Blockchain Wallets

### Option 1: Circle Sandbox Dashboard (Recommended)

1. Go to https://app-sandbox.circle.com/
2. Log in with your sandbox account
3. Navigate to "Wallets" section
4. Click "Create Wallet"
5. Select wallet type: **Blockchain Wallet**
6. Select chain: **Ethereum** (for first wallet)
7. Complete the creation process
8. Repeat for **Solana**

### Option 2: Using Circle API

Unfortunately, Circle's API doesn't allow creating blockchain wallets programmatically in the sandbox. You must use the dashboard.

## Wallet Configuration

Once you have blockchain wallets, update your `.env` file:

```env
# Example - Replace with your actual wallet IDs
CIRCLE_ETH_WALLET_ID=your-eth-wallet-id-here
CIRCLE_SOL_WALLET_ID=your-sol-wallet-id-here
```

## Finding Your Wallet IDs

After creating wallets, run:
```bash
cd ~/agentkit/circle
node find-blockchain-wallets.js
```

## Important Notes

1. **Merchant vs Blockchain Wallets**:
   - Merchant wallets (like 1017339334) hold USD
   - Blockchain wallets hold USDC on specific chains
   - Only blockchain wallets can send USDC transfers

2. **Wallet Addresses**:
   - Each blockchain wallet has an associated blockchain address
   - Example ETH: `0x75C0c372da875a4Fc78E8A37f58618a6D18904e8`
   - This is where the USDC is held on-chain

3. **Funding**:
   - New wallets start with 0 USDC
   - Fund them through Circle sandbox dashboard
   - Or transfer from your merchant wallet

## Temporary Workaround

Until you create blockchain wallets, the system won't be able to execute USDC transfers. However, all other functionality (proof generation, verification) will work normally.

## References

- Circle Sandbox: https://app-sandbox.circle.com/
- API Documentation: https://developers.circle.com/
- Example Transactions:
  - ETH: https://sepolia.etherscan.io/tx/0xcb1657cb4b134796918a7858f610b5546250d9329ebfce1c35c29d19ccccfe83
  - SOL: Explorer link for Solana transfers