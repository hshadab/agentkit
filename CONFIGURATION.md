# Configuration Guide

## Environment Variables

Create a `.env` file in the project root with the following variables:

### Required API Keys

```bash
# OpenAI API Key (Required for AI workflow parsing)
OPENAI_API_KEY=your_openai_api_key_here

# Circle API Key (Required for Gateway and CCTP operations)
CIRCLE_API_KEY=your_circle_api_key_here

# Circle Entity Secret (For programmable wallets - optional)
CIRCLE_ENTITY_SECRET=your_entity_secret_here

# Circle Wallet Set ID (For programmable wallets - optional)
CIRCLE_WALLET_SET_ID=your_wallet_set_id_here
```

### Optional API Keys

```bash
# Coinbase Developer Platform (For Base integration)
COINBASE_API_KEY=your_coinbase_api_key_here

# Avalanche API (For medical verification)
AVALANCHE_API_KEY=your_avalanche_api_key_here

# IoTeX API (For device registration)
IOTEX_API_KEY=your_iotex_api_key_here
```

### Private Keys (For Testing Only)

```bash
# Demo private key for programmatic signing (NEVER use with real funds)
# Default test key: 0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab
# This corresponds to address: 0xE616B2eC620621797030E0AB1BA38DA68D78351C
DEMO_PRIVATE_KEY=c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab
```

## Circle Gateway Configuration

### Critical EIP-712 Type Definitions

The Circle Gateway API requires EXACT field ordering in the TransferSpec type definition:

```javascript
// gateway-workflow-manager-v2.js
const types = {
    BurnIntent: [
        { name: "maxBlockHeight", type: "uint256" },
        { name: "maxFee", type: "uint256" },
        { name: "spec", type: "TransferSpec" }
    ],
    TransferSpec: [
        { name: "version", type: "uint32" },        // MUST be uint32, not uint8
        { name: "sourceDomain", type: "uint32" },
        { name: "destinationDomain", type: "uint32" },
        { name: "sourceContract", type: "bytes32" },
        { name: "destinationContract", type: "bytes32" },
        { name: "sourceToken", type: "bytes32" },
        { name: "destinationToken", type: "bytes32" },
        { name: "sourceDepositor", type: "bytes32" },
        { name: "destinationRecipient", type: "bytes32" },
        { name: "sourceSigner", type: "bytes32" },
        { name: "destinationCaller", type: "bytes32" },
        { name: "value", type: "uint256" },        // CRITICAL: Must be at position 12!
        { name: "salt", type: "bytes32" },
        { name: "hookData", type: "bytes" }
    ]
};
```

### Domain Configuration

```javascript
// Use minimal domain - Circle doesn't expect chainId or verifyingContract
const domain = {
    name: "GatewayWallet",
    version: "1"
    // NO chainId, NO verifyingContract
};
```

### Gateway Contract Addresses (Testnet)

```javascript
// Ethereum Sepolia
const ETHEREUM_GATEWAY = "0x0077777d7eba4688bdef3e311b846f25870a19b9";
const ETHEREUM_USDC = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";

// Base Sepolia  
const BASE_GATEWAY = "0x0022222abe238cc2c7bb1f21003f0a260052475b";
const BASE_USDC = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";

// Avalanche Fuji
const AVALANCHE_GATEWAY = "0x0033333fb4e8043a30fa9fb1c94bc82ccb1e0d6d";
const AVALANCHE_USDC = "0x5425890298aed601595a70ab815c96711a31bc65";
```

### Domain IDs

```javascript
const DOMAIN_IDS = {
    ETHEREUM: 0,
    AVALANCHE: 1,
    OPTIMISM: 2,
    ARBITRUM: 3,
    BASE: 6,
    POLYGON: 7
};
```

## Blockchain Network Configuration

### MetaMask Networks

#### IoTeX Testnet
```javascript
{
    chainId: '0x1252', // 4690 in decimal
    chainName: 'IoTeX Testnet',
    nativeCurrency: {
        name: 'IOTX',
        symbol: 'IOTX',
        decimals: 18
    },
    rpcUrls: ['https://babel-api.testnet.iotex.io'],
    blockExplorerUrls: ['https://testnet.iotexscan.io']
}
```

#### Base Sepolia
```javascript
{
    chainId: '0x14a34', // 84532 in decimal
    chainName: 'Base Sepolia',
    nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18
    },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org']
}
```

#### Avalanche Fuji
```javascript
{
    chainId: '0xa869', // 43113 in decimal
    chainName: 'Avalanche Fuji C-Chain',
    nativeCurrency: {
        name: 'AVAX',
        symbol: 'AVAX',
        decimals: 18
    },
    rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://testnet.snowtrace.io']
}
```

## Smart Contract Addresses

### Verifier Contracts

| Network | Contract Address | Contract Type |
|---------|-----------------|---------------|
| Ethereum Sepolia | 0x1e8150050a7a4715aad42b905c08df76883f396f | Groth16 Verifier |
| Solana Devnet | 2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7 | Program |
| Base Sepolia | 0x74D68B2481d298F337e62efc50724CbBA68dCF8f | AI Commitment |
| Avalanche Fuji | 0x30e93E8B0804fD60b0d151F724c307c61Be37EE1 | Medical Verifier |
| IoTeX Testnet | 0xAafE6C7ab60A8594a673791aB3DaDDb7b7CC0B14 | Proximity Nova |

### CCTP Contracts

| Network | TokenMessenger | MessageTransmitter |
|---------|---------------|-------------------|
| Ethereum Sepolia | 0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5 | 0x7865fAfC2db2093669d92c0F33AeEF291086BEFD |
| Base Sepolia | 0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5 | 0x7865fAfC2db2093669d92c0F33AeEF291086BEFD |
| Avalanche Fuji | 0xeb08f243E5d3FCFF26A9E38Ae5520A669f4019d0 | 0xa9fB1b3009Dcb79E2fe346c16a604B8Fa8aE0a79 |

## Library Dependencies

All JavaScript libraries are loaded locally from `/static/js/lib/` to prevent CDN failures:

```html
<!-- static/index.html -->
<script src="./js/lib/web3.min.js"></script>
<script src="./js/lib/snarkjs.min.js"></script>
<script src="./js/lib/solana-web3.min.js"></script>
<script src="./js/lib/ethers.umd.min.js"></script>
```

### Library Versions
- **web3.js**: 1.10.0
- **ethers.js**: 5.7.2
- **snarkjs**: 0.7.0
- **@solana/web3.js**: 1.87.6

## Server Configuration

### Rust WebSocket Server (Port 8001)
```toml
# Cargo.toml
[dependencies]
warp = "0.3"
tokio = { version = "1", features = ["full"] }
futures-util = "0.3"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

### Python AI Service (Port 8002)
```python
# services/chat_service.py
PORT = 8002
HOST = "0.0.0.0"
CORS_ORIGINS = ["http://localhost:8001"]
```

## zkEngine Configuration

### Binary Location
```bash
# zkEngine binary path
./zkengine_binary/zkEngine

# WASM files directory
./zkengine_binary/wasm_files/
```

### Proof Generation Parameters
```javascript
// Default proof parameters
const PROOF_CONFIG = {
    maxIterations: 1000,
    fieldSize: "21888242871839275222246405745257275088696311157297823662689037894645226208583",
    curveType: "bn254",
    proofSystem: "nova"
};
```

## Testing Configuration

### Test Wallets

```javascript
// Test wallet with testnet funds
const TEST_WALLET = {
    address: "0xE616B2eC620621797030E0AB1BA38DA68D78351C",
    privateKey: "0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab"
};
```

### Faucet URLs

- **Ethereum Sepolia**: https://sepoliafaucet.com
- **Base Sepolia**: https://faucet.quicknode.com/base/sepolia
- **Avalanche Fuji**: https://faucets.chain.link/fuji
- **IoTeX Testnet**: https://faucet.iotex.io
- **Solana Devnet**: `solana airdrop 2` or https://solfaucet.com

## Security Notes

⚠️ **IMPORTANT SECURITY CONSIDERATIONS**:

1. **Never commit `.env` files** to version control
2. **Never use test private keys** with real funds
3. **Always use environment variables** for sensitive data
4. **Rotate API keys** regularly
5. **Use separate keys** for development and production
6. **Enable IP whitelisting** on Circle Dashboard
7. **Implement rate limiting** for production deployments
8. **Use hardware wallets** for mainnet deployments

## Deployment Checklist

Before deploying to production:

- [ ] Replace all testnet addresses with mainnet addresses
- [ ] Update RPC endpoints to mainnet URLs
- [ ] Remove or secure test private keys
- [ ] Enable production API keys
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and alerting
- [ ] Implement proper error handling
- [ ] Add rate limiting
- [ ] Enable HTTPS
- [ ] Audit smart contracts
- [ ] Test disaster recovery procedures
- [ ] Document operational procedures