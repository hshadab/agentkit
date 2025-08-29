# Circle Gateway Integration

Circle Gateway enables programmatic, multi-chain USDC transfers with zkML authorization.

## Overview

The Circle Gateway integration allows AI agents to:
- Transfer USDC across multiple blockchains programmatically
- Use EIP-712 typed data signing for secure authorization
- Batch transfers for gas optimization
- Poll for transfer status and get real transaction hashes

## Architecture

```
zkML Proof Generation
        ↓
On-Chain Verification
        ↓
Circle Gateway API
        ↓
Multi-Chain USDC Transfers
```

## Key Features

### 1. Programmatic Signing
Uses EIP-712 typed data signing for secure, non-repudiable authorization:
```javascript
const signature = await wallet._signTypedData(domain, types, burnIntent);
```

### 2. Multi-Chain Support
- **Source**: Ethereum Sepolia (Domain 0)
- **Destinations**:
  - Base Sepolia (Domain 6)
  - Avalanche Fuji (Domain 1)
  - Arbitrum Sepolia (Domain 3)

### 3. Transfer Polling System
- Polls every 5 minutes for transfer status
- Stores pending transfers in localStorage
- Maximum 24 attempts (2 hours)
- Updates UI with real transaction hashes

## Configuration

### Gateway Wallet
```
Address: 0x0077777d7EBA4688BDeF3E311b846F25870A19B9
```

### Minimum Transfer Amounts
- **Per chain**: 2.000001 USDC
- **Total for 2 chains**: 4.000002 USDC

### API Configuration
```javascript
const GATEWAY_API = 'https://gateway-api-testnet.circle.com';
const API_KEY = 'SAND_API_KEY:...'; // Sandbox key
```

## Transfer Flow

### 1. Initiate Transfer
```javascript
const burnIntent = {
    maxBlockHeight: MAX_UINT256,
    maxFee: "2000001",
    spec: {
        sourceDomain: 0,
        destinationDomain: 6,
        value: "2000001",
        sender: senderAddress,
        recipient: recipientAddress,
        inputToken: USDC_ADDRESS,
        outputToken: destinationToken,
        flow: "MINT"
    }
};
```

### 2. Sign Intent
```javascript
const signature = await wallet._signTypedData(domain, types, burnIntent);
```

### 3. Submit to Gateway
```javascript
const response = await fetch(`${GATEWAY_API}/v1/burn`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        signature,
        intent: signedIntent
    })
});
```

### 4. Poll for Status
```javascript
const status = await fetch(`${GATEWAY_API}/v1/transfers/${transferId}`, {
    headers: {
        'Authorization': `Bearer ${API_KEY}`
    }
});
```

## Response Format

### Initial Response (Attestation)
```json
{
    "transferId": "02f92032-...",
    "attestation": "0x1a2b3c..." // 498-character hex proof
}
```

### Status Response (After Settlement)
```json
{
    "transferId": "02f92032-...",
    "status": "SETTLED",
    "transaction": {
        "txHash": "0x123abc...",
        "blockNumber": 12345,
        "chain": "BASE_SEPOLIA"
    }
}
```

## Testing

### Check Gateway Balance
```bash
curl -X POST https://gateway-api-testnet.circle.com/v1/balances \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "USDC",
    "sources": [{
      "domain": 0,
      "depositor": "0x0077777d7EBA4688BDeF3E311b846F25870A19B9"
    }]
  }'
```

### Execute Test Transfer
```bash
node circle-gateway/scripts/test-gateway-transfer.js
```

## Important Notes

1. **Attestations vs Transactions**: Gateway returns attestations immediately, not transaction hashes. Real transactions appear 15-30 minutes later after batch settlement.

2. **Domain Restrictions**: Cannot transfer within same domain (e.g., Ethereum → Ethereum).

3. **Balance Requirements**: Must have sufficient USDC in Gateway wallet, not regular wallet.

4. **Gas Optimization**: Transfers are batched for gas efficiency, causing the settlement delay.

## Files

```
circle-gateway/
├── api/                  # Gateway API integrations
├── scripts/
│   ├── deposit-all-usdc.js      # Deposit USDC to Gateway
│   └── test-gateway-transfer.js  # Test transfer script
├── tests/                # Integration tests
└── docs/                 # Additional documentation
```

## Support

For issues or questions:
- Check Circle Gateway [documentation](https://developers.circle.com/gateway)
- View [testnet faucet](https://faucet.circle.com/) for test USDC
- See main [AgentKit README](../README.md) for overall system docs