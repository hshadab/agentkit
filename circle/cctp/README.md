# Circle CCTP (Cross-Chain Transfer Protocol) Integration

## Overview
CCTP enables native USDC transfers across blockchains without bridges. Unlike Gateway (which uses attestations), CCTP burns USDC on the source chain and mints on the destination chain.

## Key Differences from Gateway

| Feature | Gateway | CCTP |
|---------|---------|------|
| Transfer Method | Attestation-based | Burn-and-mint |
| Settlement Time | 15-30 minutes | ~15 minutes |
| Supported Chains | Limited testnet | Wide mainnet support |
| Gas Costs | Lower | Higher (two transactions) |

## Supported Routes
- Ethereum ↔ Avalanche
- Ethereum ↔ Arbitrum
- Ethereum ↔ Optimism
- Ethereum ↔ Base
- Ethereum ↔ Polygon

## Implementation Status
🚧 **Coming Soon** - CCTP integration is planned for Q1 2025

## Architecture
```
Source Chain          Circle           Destination Chain
     │                  │                     │
     ├─ Burn USDC ─────>│                     │
     │                  │                     │
     │              Attestation               │
     │                  │                     │
     │                  ├─ Mint Message ─────>│
     │                  │                     │
     │                  │              Mint USDC
```

## Use Cases
- High-value transfers requiring native USDC
- Cross-chain DeFi operations
- Institutional settlements
- Multi-chain treasury management