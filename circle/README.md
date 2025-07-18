# Circle Integration Scripts

This directory contains scripts for managing Circle wallets and USDC transfers.

## Quick Start

1. **Create Wallets**
   ```bash
   node circle/create-wallets-api.js
   ```
   Creates Ethereum and Solana wallets via Circle API.

2. **Fund Wallets** 
   ```bash
   node circle/fund-wallets.js
   ```
   Transfers USD from merchant wallet to blockchain wallets.

3. **Check Balances**
   ```bash
   node circle/check-wallet-balance.js
   ```
   Shows current balances and addresses for all wallets.

4. **Test Transfer**
   ```bash
   node circle/test-transfer.js
   ```
   Tests USDC transfer functionality.

5. **Execute Transfer**
   ```bash
   node circle/executeTransfer.js "send 0.05 USDC to alice on ethereum"
   ```
   Natural language interface for transfers.

## Key Scripts

### Setup & Configuration
- `create-wallets-api.js` - Creates new blockchain wallets
- `fund-wallets.js` - Funds wallets with USD
- `setup-developer-wallets.js` - Info about developer-controlled wallets

### Operations
- `circleHandler.js` - Core transfer functionality
- `executeTransfer.js` - CLI for natural language transfers
- `recipientResolver.js` - Maps names to addresses

### Monitoring
- `check-wallet-balance.js` - Check wallet balances
- `find-blockchain-wallets.js` - Find wallets with addresses

### Integration
- `zkpCircleIntegration.js` - ZKP + USDC transfers
- `workflowExecutor.js` - Multi-step workflows

## Important Notes

1. **USD to USDC Conversion**: Circle automatically converts USD to USDC for blockchain transfers
2. **Wallet IDs**: Must be integers (e.g., 1017342606), not UUIDs
3. **Test Environment**: This is sandbox only - not for production
4. **API Key Format**: `SAND_API_KEY:xxx:xxx`

## Common Issues

1. **"insufficient_funds"**: Wallet needs USD balance
2. **"wallet id not parsable"**: Update .env with real wallet IDs
3. **Pending transfers**: May take 10-60 seconds to complete

See `/docs/CIRCLE_SETUP_COMPLETE_GUIDE.md` for detailed documentation.