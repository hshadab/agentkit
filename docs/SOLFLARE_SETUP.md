# Solflare Wallet Setup for Solana Verification

## Overview
This guide explains how to set up and use Solflare wallet for Solana on-chain verification in the Verifiable Agent Kit.

## Installation

1. **Install Solflare Browser Extension**
   - Chrome: https://chrome.google.com/webstore/detail/solflare-wallet/bhhhlbepdkbapadjdnnojkbgioiodbic
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/solflare-wallet/
   - Brave: Use Chrome Web Store link

2. **Create or Import Wallet**
   - Open Solflare extension
   - Create a new wallet or import existing one
   - Save your seed phrase securely

## Configuration

### 1. Connect to Devnet
- Click on the network selector (usually shows "Mainnet")
- Select "Devnet" from the dropdown
- This is required for testing without real SOL

### 2. Get Devnet SOL for Testing
- Visit: https://solfaucet.com/
- Enter your Solflare wallet address
- Request test SOL (usually 1-2 SOL is enough)

### 3. Using with Verifiable Agent Kit

The application automatically detects and prioritizes Solflare when available:

```javascript
// Wallet detection priority order:
1. Solflare (preferred)
2. Phantom
3. Backpack
4. Generic Solana wallet
```

### 4. Optional: Set Specific Wallet Address

If you want to use a specific Solflare wallet address, add to your `.env`:

```bash
SOLFLARE_WALLET_ADDRESS=YourSolflareWalletAddressHere
```

## Usage

1. **Navigate to the Verifiable Agent Kit UI**
   - Open http://localhost:8001

2. **Generate a Proof**
   - Select any proof type (KYC, Location, AI)
   - Click "Generate Proof"

3. **Verify on Solana**
   - Click "Verify on Solana"
   - Solflare will automatically open
   - Review the transaction
   - Click "Approve" to sign

4. **View on Explorer**
   - After verification, click the explorer link
   - Transaction will be visible on Solana Explorer

## Wallet Features Supported

- ✅ Connect/Disconnect
- ✅ Sign transactions
- ✅ Auto-detection
- ✅ Devnet support
- ✅ Transaction history
- ✅ Multiple accounts

## Troubleshooting

### Solflare Not Detected
1. Ensure extension is installed and enabled
2. Refresh the page
3. Check if wallet is unlocked

### Connection Failed
1. Make sure you're on Devnet
2. Check if you have sufficient SOL balance
3. Try disconnecting and reconnecting

### Transaction Failed
1. Ensure you have at least 0.01 SOL for fees
2. Check network status at https://status.solana.com/
3. Try again with a fresh connection

## Security Notes

- Never share your seed phrase
- Always verify transaction details before signing
- Use Devnet for testing, Mainnet for production
- Keep your extension updated

## Program Details

- **Program ID**: `2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7`
- **Network**: Solana Devnet
- **Explorer**: https://explorer.solana.com/?cluster=devnet

## Support

If you encounter issues:
1. Check browser console for errors
2. Ensure Solflare is on the correct network
3. Try with a different browser
4. Report issues at: https://github.com/anthropics/agentkit/issues