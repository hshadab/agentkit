# AgentKit Documentation

Welcome to the AgentKit documentation. This guide will help you get started with the Verifiable Agent Kit for zero-knowledge proof generation and blockchain verification.

## Quick Links

- 🚀 [Quick Start Guide](../README.md) - Get up and running in 5 minutes
- 🔧 [Installation](getting-started/installation.md) - Detailed setup instructions
- 🔍 [Troubleshooting](getting-started/troubleshooting.md) - Common issues and solutions
- 📖 [API Documentation](api/) - REST and WebSocket APIs

## Documentation Structure

### 📚 Getting Started
- [Installation](getting-started/installation.md) - Set up AgentKit
- [Configuration](getting-started/configuration.md) - Configure environment and services
- [Troubleshooting](getting-started/troubleshooting.md) - Solve common problems

### 📖 Guides
- [Circle Integration](guides/circle-integration.md) - Set up USDC transfers
- [Blockchain Deployment](guides/blockchain-deployment.md) - Deploy to all networks
- [Wallet Setup](guides/wallet-setup.md) - Configure wallets

### 🏗️ Architecture
- [Overview](architecture/overview.md) - System architecture
- [Technical Design](architecture/technical-design.md) - Deep technical details
- [Directory Structure](architecture/directory-structure.md) - Project organization

### 🔄 Workflows
- [KYC Verification](workflows/kyc-verification.md) - Privacy-preserving KYC
- [AI Prediction](workflows/ai-prediction.md) - AI model predictions with proofs
- [Medical Integrity](workflows/medical-integrity.md) - Medical data verification

### 🔌 API Reference
- [REST API](api/rest-api.md) - HTTP endpoints
- [WebSocket API](api/websocket-api.md) - Real-time communication
- [SDK Reference](api/sdk-reference.md) - Client libraries

## Deployed Contracts

### Mainnet/Testnet Addresses
- **Ethereum Sepolia**: [`0x09378444046d1ccb32ca2d5b44fab6634738d067`](https://sepolia.etherscan.io/address/0x09378444046d1ccb32ca2d5b44fab6634738d067)
- **Solana Devnet**: [`2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7`](https://explorer.solana.com/address/2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7?cluster=devnet)
- **Base Sepolia**: [`0x74D68B2481d298F337e62efc50724CbBA68dCF8f`](https://sepolia.basescan.org/address/0x74D68B2481d298F337e62efc50724CbBA68dCF8f)
- **Avalanche Fuji**: [`0x30e93E8B0804fD60b0d151F724c307c61Be37EE1`](https://testnet.snowtrace.io/address/0x30e93E8B0804fD60b0d151F724c307c61Be37EE1)
- **IoTeX Testnet**: [`0xd3778e76ce0131762337464EEF1BAefFc608e8e0`](https://testnet.iotexscan.io/address/0xd3778e76ce0131762337464EEF1BAefFc608e8e0)

## Key Features

- 🔐 **Zero-Knowledge Proofs** - Generate privacy-preserving proofs
- ⛓️ **Multi-Chain Support** - Ethereum, Solana, Base, Avalanche, IoTeX
- 💸 **USDC Integration** - Automated payments via Circle API
- 🤖 **AI-Powered Workflows** - Natural language to proof generation
- 🏭 **Production Ready** - Real zkEngine Nova proof system

## Quick Start Example

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Start the system
npm start

# Open browser
# Navigate to http://localhost:8001
# Try: "I am KYC verified"
```

## Test Token Faucets

- [Ethereum Sepolia](https://sepoliafaucet.com/)
- [Base Sepolia](https://faucet.quicknode.com/base/sepolia)  
- [Avalanche Fuji](https://faucets.chain.link/fuji)
- [IoTeX Testnet](https://faucet.iotex.io/)
- [Solana Devnet](https://faucet.solana.com/)

## Getting Help

- 📋 Check [Troubleshooting](getting-started/troubleshooting.md)
- 🐛 Enable debug mode: `DEBUG=true npm start`
- 💬 [Create an issue](https://github.com/yourusername/agentkit/issues)

---

For the main project README and quick start, see [../README.md](../README.md)