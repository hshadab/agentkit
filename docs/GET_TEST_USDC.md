# How to Get Test USDC for Your Circle Wallet

## Your Wallet Addresses for Receiving USDC

### Ethereum (Sepolia Testnet)
**Deposit Address**: `0x82a26a6d847e7e0961ab432b9a5a209e0db41040`
- Use this address to receive USDC from external sources
- This is shown in your Circle dashboard

### Solana (Devnet)
Check your dashboard for the Solana deposit address (similar to the ETH one)

## Methods to Get Test USDC

### 1. Circle Faucet (Check if available)
- Visit: https://faucet.circle.com/
- Enter your deposit address
- Request test USDC

### 2. Sepolia USDC Faucets
- Search for "Sepolia USDC faucet" 
- Common faucets:
  - Alchemy Sepolia faucet
  - Chainlink faucet
  - Ethereum Sepolia faucet (get ETH first, then swap)

### 3. Use Existing Test USDC
If you have access to another wallet with test USDC:
1. Send USDC to: `0x82a26a6d847e7e0961ab432b9a5a209e0db41040`
2. Network: Ethereum Sepolia
3. Token: USDC (check contract address for Sepolia USDC)

### 4. Circle Dashboard Options
In the dashboard, also check:
- "Sandbox" or "Testing" menu
- "Developer Tools"
- Help/Documentation section for sandbox-specific instructions

## USDC Contract Addresses

### Ethereum Sepolia
USDC Contract: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
(Verify this is current at https://developers.circle.com/)

### After Getting USDC
Once you have USDC in your wallet:
1. Run `node test-transfer.js` to test transfers
2. Your demo will work with USDC transfers!

## Important Notes
- You need USDC tokens, not just USD balance
- The deposit address from dashboard is different from API address
- Test USDC is free but might require verification on some faucets