# zkML Verification on Ethereum Sepolia

## Current Status

The system is configured for Ethereum Sepolia verification but the contract deployment is pending wallet funding.

### Configuration Complete ✅
- Backend configured for Ethereum Sepolia
- Gateway defaults to Ethereum network
- Simulated verification working
- Deployment script ready

### Deployment Pending ⏳
- **Required**: ~0.005 ETH on Sepolia
- **Wallet**: `0xE616B2eC620621797030E0AB1BA38DA68D78351C`
- **Current Balance**: 0.00001 ETH (insufficient)

## How to Deploy on Ethereum

### Step 1: Fund the Wallet
Get Sepolia ETH from one of these faucets:
1. https://sepoliafaucet.com (0.5 ETH daily)
2. https://faucet.quicknode.com/ethereum/sepolia
3. https://www.alchemy.com/faucets/ethereum-sepolia
4. https://sepolia-faucet.pk910.de (PoW faucet)

Send at least 0.005 ETH to: `0xE616B2eC620621797030E0AB1BA38DA68D78351C`

### Step 2: Deploy Contract
```bash
npx hardhat run scripts/deploy-zkml-real.js --network sepolia
```

### Step 3: Update Backend
Edit `api/zkml-verifier-backend.js` and replace the Sepolia address with the deployed contract address.

### Step 4: Test
```bash
node gateway/tests/test-ethereum-zkml-verification.js
```

## Current Ethereum Configuration

### Backend (`api/zkml-verifier-backend.js`)
```javascript
'sepolia': {
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    chainId: 11155111,
    verifierAddress: '0x9876543210987654321098765432109876543210' // To be deployed
}
```

### Gateway (`static/js/ui/gateway-workflow-manager-v3.js`)
```javascript
network: window.VERIFICATION_NETWORK || 'sepolia', // Defaults to Ethereum
```

## Using Ethereum Verification

### With Simulated Mode (Current)
The system will automatically use simulated verification until the contract is deployed:
```javascript
// Just use the Gateway normally
// It will simulate Ethereum verification
```

### With Real Contract (After Deployment)
Once deployed and backend updated:
```javascript
// Add to URL
?real=true

// Or in console
window.USE_REAL_CHAIN_VERIFICATION = true;
```

## Alternative: Use IoTeX (Already Deployed)

If you need real on-chain verification immediately, use the already deployed IoTeX contract:

```javascript
// In browser console
window.VERIFICATION_NETWORK = 'iotex-testnet';
window.USE_REAL_CHAIN_VERIFICATION = true;
```

**IoTeX Contract**: `0xD782e96B97153ebE3BfFB24085A022c2320B7613`
- ✅ Already deployed and tested
- ✅ Gas costs only ~$0.02
- ✅ 5-second confirmations

## Verification Flow

1. **Step 1**: zkML proof generation (JOLT-Atlas)
2. **Step 2**: On-chain verification (Ethereum/IoTeX)
3. **Step 3**: Circle Gateway USDC transfer

## Gas Costs Comparison

| Network | Gas Used | Cost (USD) | Status |
|---------|----------|------------|--------|
| Ethereum Mainnet | ~384k | $15-30 | Not deployed |
| Ethereum Sepolia | ~384k | Free (testnet) | Pending funding |
| IoTeX Testnet | ~384k | ~$0.02 | ✅ Deployed |

## Summary

The system is fully configured for Ethereum Sepolia verification. To activate real on-chain verification:

1. **Option A**: Fund wallet and deploy to Ethereum Sepolia
2. **Option B**: Use existing IoTeX deployment (immediate availability)

Both options provide real cryptographic proof verification on-chain, with the main difference being the network and gas costs.