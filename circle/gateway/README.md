# Circle Gateway Integration

Cross-chain USDC transfers with ZKP verification support.

## Overview

Circle Gateway enables instant USDC transfers between different blockchain networks while maintaining zero-knowledge proof verification capabilities.

## Features

- ✅ Cross-chain USDC transfers (Ethereum ↔ Base ↔ Avalanche)
- ✅ ZKP verification before transfers
- ✅ Testnet support (Sepolia, Base Sepolia, Fuji)
- ✅ Integration with existing Circle API workflows

## Folder Structure

```
gateway/
├── README.md                    # This file
├── gatewayHandler.js           # Core Gateway functionality
├── zkpGatewayIntegration.js    # ZKP + Gateway workflows
├── config.js                   # Network and contract configuration
├── contracts/                  # Contract addresses and ABIs
│   ├── addresses.json          # Deployed contract addresses
│   └── abis/                   # Contract ABIs
├── examples/                   # Usage examples
│   ├── deposit.js              # Deposit USDC to Gateway
│   ├── transfer.js             # Cross-chain transfer
│   └── zkp-transfer.js         # ZKP verified transfer
└── tests/                      # Test files
    ├── gateway.test.js         # Gateway functionality tests
    └── integration.test.js     # End-to-end tests
```

## Quick Start

1. **Set up environment**:
   ```bash
   # Add to .env
   GATEWAY_PRIVATE_KEY=your_private_key
   GATEWAY_ETH_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_KEY
   GATEWAY_BASE_SEPOLIA_RPC=https://base-sepolia.infura.io/v3/YOUR_KEY
   ```

2. **Deposit USDC**:
   ```bash
   node circle/gateway/examples/deposit.js
   ```

3. **Cross-chain transfer**:
   ```bash
   node circle/gateway/examples/transfer.js
   ```

4. **ZKP verified transfer**:
   ```bash
   node circle/gateway/examples/zkp-transfer.js
   ```

## Integration with Existing Workflows

This Gateway integration complements the existing Circle API integration:

- **Standard Circle API**: Same-chain transfers via REST API
- **Circle Gateway**: Cross-chain transfers via smart contracts
- **Combined**: ZKP verification + cross-chain capabilities

## Networks Supported

### Testnet
- Ethereum Sepolia
- Base Sepolia  
- Avalanche Fuji

### Mainnet (Future)
- Ethereum
- Base
- Avalanche

## Usage Examples

### Basic Cross-Chain Transfer
```javascript
import GatewayHandler from './gatewayHandler.js';

const gateway = new GatewayHandler();
await gateway.initialize();

// Deposit on Ethereum, transfer to Base
await gateway.deposit('ETH', '10.0');
await gateway.transfer('ETH', 'BASE', '5.0', recipientAddress);
```

### ZKP Verified Transfer
```javascript
import ZKPGatewayIntegration from './zkpGatewayIntegration.js';

const zkpGateway = new ZKPGatewayIntegration();

// Generate proof and execute cross-chain transfer
await zkpGateway.verifyAndTransfer({
  proofType: 'kyc',
  amount: '10.0',
  fromChain: 'ETH',
  toChain: 'BASE',
  recipient: 'alice'
});
```