# Configuration Guide

This guide covers all configuration options for the Verifiable Agent Kit, including multi-chain setup and deployment.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Blockchain Configuration](#blockchain-configuration)
3. [Network Setup](#network-setup)
4. [Contract Deployment](#contract-deployment)
5. [Wallet Configuration](#wallet-configuration)

## Environment Variables

### Required Variables

```env
# OpenAI API Key (REQUIRED)
OPENAI_API_KEY=sk-your-actual-api-key-here

# zkEngine Binary Path
ZKENGINE_BINARY=./zkengine_binary/zkEngine
```

### Optional Variables

```env
# Circle API Configuration (for USDC transfers)
CIRCLE_API_KEY=your_circle_api_key
CIRCLE_ETH_WALLET_ID=your_ethereum_wallet_id
CIRCLE_SOL_WALLET_ID=your_solana_wallet_id

# Server Ports
PORT=8001                    # Rust WebSocket server
CHAT_SERVICE_PORT=8002       # Python AI service

# Private Keys (for deployments only)
PRIVATE_KEY=0x...           # Ethereum/Base deployment
AVALANCHE_PRIVATE_KEY=0x... # Avalanche deployment
```

## Blockchain Configuration

### Frontend Configuration (`static/js/config.js`)

```javascript
export const config = {
    blockchain: {
        ethereum: {
            chainId: '0xaa36a7',  // Sepolia
            chainIdDecimal: 11155111,
            verifierAddress: '0x1e8150050a7a4715aad42b905c08df76883f396f',
            explorerUrl: 'https://sepolia.etherscan.io'
        },
        solana: {
            network: 'devnet',
            verifierProgramId: '2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7',
            explorerUrl: 'https://explorer.solana.com'
        },
        base: {
            chainId: '0x14a34',  // Base Sepolia
            chainIdDecimal: 84532,
            contracts: {
                zkVerifier: '0x74D68B2481d298F337e62efc50724CbBA68dCF8f',
                aiPredictionCommitment: '0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC'
            },
            explorerUrl: 'https://sepolia.basescan.org'
        },
        avalanche: {
            chainId: '0xa869',  // Fuji testnet
            chainIdDecimal: 43113,
            contracts: {
                zkVerifier: '0x112E448fFD99c224b6aa24746E9B34E09A8E6C46'
            },
            explorerUrl: 'https://testnet.snowtrace.io',
            rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
            name: 'Avalanche Fuji Testnet'
        }
    }
};
```

## Network Setup

### MetaMask Configuration

#### Avalanche Fuji Testnet
- **Network Name**: Avalanche Fuji C-Chain
- **RPC URL**: https://api.avax-test.network/ext/bc/C/rpc
- **Chain ID**: 43113 (0xa869)
- **Currency Symbol**: AVAX
- **Block Explorer**: https://testnet.snowtrace.io

#### Base Sepolia
- **Network Name**: Base Sepolia
- **RPC URL**: https://sepolia.base.org
- **Chain ID**: 84532 (0x14a34)
- **Currency Symbol**: ETH
- **Block Explorer**: https://sepolia.basescan.org

### Getting Test Tokens

#### Avalanche Fuji
1. [Chainlink Faucet](https://faucets.chain.link/fuji) - 0.5 AVAX
2. [Official AVAX Faucet](https://faucet.avax.network/) - 2 AVAX (requires coupon code)

#### Ethereum Sepolia
1. [Sepolia Faucet](https://sepoliafaucet.com/)
2. [Alchemy Faucet](https://sepoliafaucet.com/)

#### Base Sepolia
1. [Base Faucet](https://faucet.quicknode.com/base/sepolia)
2. Bridge from Sepolia using [Base Bridge](https://bridge.base.org/)

#### Solana Devnet
```bash
solana airdrop 2  # Requires Solana CLI
```

## Contract Deployment

### Deploying to Avalanche Fuji

1. **Set up environment**
   ```bash
   # Add to .env
   AVALANCHE_PRIVATE_KEY=your_private_key_here
   ```

2. **Run deployment script**
   ```bash
   node scripts/deploy/deploy-avalanche-verifier.js
   ```

3. **Update configuration**
   - Update `static/js/config.js` with new contract address
   - Update `static/avalanche-verifier.js` fallback address

### Deployment Addresses

| Network | Contract Type | Address |
|---------|--------------|---------|
| Ethereum Sepolia | Groth16 Verifier | `0x1e8150050a7a4715aad42b905c08df76883f396f` |
| Solana Devnet | Proof Verifier Program | `2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7` |
| Base Sepolia | ZK Verifier | `0x74D68B2481d298F337e62efc50724CbBA68dCF8f` |
| Base Sepolia | AI Prediction | `0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC` |
| Avalanche Fuji | Groth16 Verifier | `0x112E448fFD99c224b6aa24746E9B34E09A8E6C46` |

## Wallet Configuration

### Frontend Auto-Connect

The system automatically reconnects to previously connected wallets using localStorage:

```javascript
// Stored keys
'ethereum-connected': 'true'
'solana-connected': 'true'
'base-connected': 'true'
'avalanche-connected': 'true'
```

### Supported Wallets

- **EVM Chains** (Ethereum, Base, Avalanche): MetaMask
- **Solana**: Solflare (preferred), Phantom, Backpack

### Connection Flow

1. User clicks "Connect Wallet" or verification button
2. System prompts for wallet connection
3. If wrong network, prompts to switch
4. Stores connection state for auto-reconnect

## Advanced Configuration

### Custom RPC Endpoints

To use custom RPC endpoints, modify the config:

```javascript
avalanche: {
    rpcUrl: 'https://your-custom-rpc.com',
    // ... other settings
}
```

### Gas Settings

For deployment and verification:

```javascript
// In deployment scripts
gas: Math.floor(gasEstimate * 1.2),  // 20% buffer
gasPrice: await web3.eth.getGasPrice()
```

### Error Handling

The system includes automatic retry logic for:
- Network connection failures
- Transaction timeouts
- Wallet connection issues

## Troubleshooting

### Common Issues

1. **"Please switch to Avalanche Fuji Testnet"**
   - MetaMask is on wrong network
   - Click switch network when prompted

2. **"Insufficient balance"**
   - Need test tokens from faucet
   - Avalanche: ~0.1 AVAX for deployment, ~0.01 for verification

3. **"Avalanche verifier not loaded"**
   - Ensure `avalanche-verifier.js` is included in `index.html`
   - Check browser console for loading errors

### Debug Mode

Enable debug logging in `static/js/config.js`:

```javascript
ui: {
    debugMode: true
}
```

## Security Best Practices

1. **Never commit private keys** - Use environment variables
2. **Use test networks** for development
3. **Verify contract addresses** before transactions
4. **Keep dependencies updated** for security patches

## Next Steps

- Deploy your own verifier contracts
- Customize proof types and parameters
- Add support for additional networks
- Integrate with your application

For more details, see the [Technical Architecture](TECHNICAL_ARCHITECTURE.md) document.