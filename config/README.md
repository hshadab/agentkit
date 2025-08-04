# Centralized Configuration

This directory contains the centralized configuration for the AgentKit project.

## Files

- `index.js` - Main configuration file for Node.js environments (server-side)
- `browser.js` - Browser-safe configuration for frontend usage

## Usage

### Server-side (Node.js)
```javascript
const config = require('./config');

// Access configuration
console.log(config.services.rust.port);
console.log(config.networks.ethereum.chainId);

// Use helper functions
const network = config.getNetworkByChainId('0xaa36a7');
const hardhatNetworks = config.getHardhatNetworks();
```

### Frontend (Browser)
```javascript
import { config } from './config/browser.js';

// Access configuration
console.log(config.websocket.url);
console.log(config.blockchain.ethereum.verifierAddress);
```

## Environment Variables

The configuration uses the following environment variables from `.env`:

- `PORT` - Rust WebSocket server port (default: 8001)
- `CHAT_SERVICE_PORT` - Python AI service port (default: 8002)
- `OPENAI_API_KEY` - OpenAI API key (required)
- `CIRCLE_API_KEY` - Circle API key for USDC transfers
- `CIRCLE_ETH_WALLET_ID` - Circle Ethereum wallet ID
- `CIRCLE_SOL_WALLET_ID` - Circle Solana wallet ID
- `COINBASE_API_KEY` - Coinbase API key
- `ZKENGINE_BINARY` - Path to zkEngine binary
- `PRIVATE_KEY` - Default private key for deployments
- `AVALANCHE_PRIVATE_KEY` - Avalanche network private key
- `IOTEX_PRIVATE_KEY` - IoTeX network private key
- `INFURA_PROJECT_ID` - Infura project ID for Ethereum RPC

## Network Configuration

All blockchain network configurations are centralized in the `networks` object.
Each network includes:

- `name` - Human-readable network name
- `chainId` - Hex chain ID
- `chainIdDecimal` - Decimal chain ID
- `rpcUrl` - RPC endpoint URL
- `contracts` - Deployed contract addresses
- `explorerUrl` - Block explorer URL
- `gasPrice` - Gas price (optional)

## Migration from Old Config

The old configuration files have been replaced:
- `/static/js/core/config.js` now imports from `/config/browser.js`
- `hardhat.config.cjs` now uses `config.getHardhatNetworks()`
- Multiple `.env` files consolidated into root `.env`