# Circle Gateway Balance Information

## Current Balance
Your current Gateway unified balance: **3.80 USDC**

## How to Increase Gateway Balance

### Method 1: Transfer USDC to Gateway Wallet
Transfer USDC to the Gateway wallet address on any supported testnet:
- **Gateway Wallet Address**: `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`

Supported testnets and USDC contracts:
- **Ethereum Sepolia**: USDC at `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **Base Sepolia**: USDC at `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Avalanche Fuji**: USDC at `0x5425890298aed601595a70AB815c96711a31Bc65`

### Method 2: Use Circle Faucet
1. Visit Circle's testnet faucet (if available)
2. Request testnet USDC
3. Send to Gateway wallet address above

### Method 3: Use DEX on Testnet
1. Get testnet ETH/AVAX/BASE from faucets
2. Swap for USDC on testnet DEX
3. Transfer USDC to Gateway wallet

## Check Your Balance

### Via Circle API
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://gateway-api-testnet.circle.com/v1/balances/0x0077777d7EBA4688BDeF3E311b846F25870A19B9
```

### Via Blockchain Explorer
Check the Gateway wallet USDC balance:
- [Ethereum Sepolia](https://sepolia.etherscan.io/token/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238?a=0x0077777d7EBA4688BDeF3E311b846F25870A19B9)
- [Base Sepolia](https://sepolia.basescan.org/token/0x036CbD53842c5426634e7929541eC2318f3dCF7e?a=0x0077777d7EBA4688BDeF3E311b846F25870A19B9)
- [Avalanche Fuji](https://testnet.snowtrace.io/token/0x5425890298aed601595a70AB815c96711a31Bc65?a=0x0077777d7EBA4688BDeF3E311b846F25870A19B9)

## Fee Structure
- Current fee per transfer: **0.5 USDC** (reduced from 2.1 USDC for testing)
- Minimum balance needed: Transfer amount + 0.5 USDC fee

## Notes
- The Gateway balance is unified across all supported chains
- Transfers are instant (<500ms) across chains
- The balance shown in the UI is the real-time balance from Circle's API