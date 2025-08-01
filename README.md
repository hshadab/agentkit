# Verifiable Agent Kit

A production-ready framework for privacy-preserving AI agents with real zero-knowledge proofs using zkEngine Nova recursive proofs. Features multi-chain verification, automated USDC transfers, and IoTeX DePIN integration. Build trustless, verifiable compute applications using natural language commands.

## 🚀 Key Features

### Core Capabilities
- **Real Zero-Knowledge Proofs** - Generate cryptographic proofs using zkEngine (Nova → Groth16 SNARKs)
- **5 Blockchain Networks** - Deploy and verify proofs on Ethereum, Solana, Base, Avalanche, and IoTeX
- **5 Proof Types** - KYC, Device Proximity (IoT), AI Prediction, Medical Integrity, AI Content
- **Automated USDC Transfers** - Real conditional transfers via Circle API and Coinbase API
- **OpenAI-Powered Workflows** - GPT-4o integration for intelligent natural language parsing
- **Real-Time WebSocket UI** - Live tracking of proof generation, verification, and transfers
- **No Simulations** - Everything is real: proofs, blockchain transactions, and USDC transfers

### Supported Proof Types

#### 1. **KYC Compliance Proof**
Proves identity verification without revealing personal information.
- **Use cases**: DeFi compliance, financial applications, regulatory requirements
- **Blockchain**: Ethereum, Base, Avalanche
- **Example**: `"Generate a KYC proof and verify on Ethereum"`

#### 2. **Device Proximity Proof** (IoT Integration)
Proves IoT device location and proximity for IoTeX blockchain with real Nova proofs.
- **Features**: IoT device authentication, ioID integration, IOTX reward mechanisms
- **Use cases**: Smart city applications, supply chain tracking, DePIN verification
- **Blockchain**: IoTeX with ProximityNovaDecider
- **Example**: `"Register IoT device TESTDEV123 with proximity proof at location 5050,5050"`

#### 3. **AI Prediction Proof**
Proves AI predictions were made before events occurred with blockchain timestamps.
- **Use cases**: Trading predictions, weather forecasting, outcome verification
- **Blockchain**: Base with commitment contract
- **Example**: `"Generate an AI prediction proof that Bitcoin will reach $100k by end of 2025"`

#### 4. **Medical Integrity Proof**
Proves medical record integrity and patient data validity without exposing sensitive information.
- **Use cases**: Healthcare data verification, clinical trial integrity, patient privacy
- **Blockchain**: Avalanche Fuji
- **Example**: `"Generate medical integrity proof for patient record and verify on Avalanche"`

#### 5. **AI Content Proof**
Proves AI-generated content authenticity and ownership with cryptographic verification.
- **Use cases**: Content attribution, AI art verification, intellectual property
- **Blockchain**: Multi-chain support
- **Example**: `"Generate AI content proof for my generated text"`

### Blockchain Support

| Blockchain | Network | Contract/Program | Features |
|------------|---------|------------------|----------|
| **Ethereum** | Sepolia | 0x1e8150050a7a4715aad42b905c08df76883f396f | EVM verification |
| **Solana** | Devnet | 2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7 | High-speed verification |
| **Base** | Sepolia | 0x74D68B2481d298F337e62efc50724CbBA68dCF8f | AI commitment contract |
| **Avalanche** | Fuji | 0x30e93E8B0804fD60b0d151F724c307c61Be37EE1 | Medical integrity verifier |
| **IoTeX** | Testnet | 0xd3778e76ce0131762337464EEF1BAefFc608e8e0 | ProximityNovaDecider for IoT |

### USDC Transfer Integration
- **Circle Developer Wallet** - Programmable wallets with automated transfers
- **Coinbase API** - Alternative transfer method with API integration
- **Multi-blockchain Support** - Send USDC on Ethereum and Solana
- **Conditional Transfers** - Automated based on proof verification

## 🏗️ Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   Frontend UI       │────▶│  Rust WebSocket      │────▶│ zkEngine Binary     │
│  (localhost:8001)   │◀────│  Server (Port 8001)  │◀────│ (Nova → Groth16)    │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
         │                           │                             │
         ▼                           ▼                             ▼
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│ Blockchain Wallets  │     │ Python AI Service    │     │ Transfer APIs       │
│ • MetaMask          │     │ • OpenAI GPT-4o      │     │ • Circle API        │
│ • Solflare          │     │ • Port 8002          │     │ • Coinbase API      │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

## 💡 Example Commands

### Simple Verification
```
"Generate a KYC proof and verify it locally"
```

### Blockchain Verification with Transfer
```
"Generate KYC proof for Alice, verify on Ethereum, and if verified transfer 0.02 USDC to Bob on Solana"
```

### IoT Device Verification
```
"Generate device proximity proof for my IoT device at coordinates x=5000, y=5000"
```

### AI Prediction with Timestamp
```
"Generate an AI prediction proof that Bitcoin will reach $100k by end of 2025"
```

### Complex Multi-Step Workflow
```
"Create KYC proof for Alice, verify on chain, then create age proof over 21, and if both valid send 5 USDC to Alice"
```

## 🔧 Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/agentkit.git
cd agentkit
```

2. **Install dependencies**
```bash
# Node.js dependencies
npm install

# Python dependencies
pip install -r requirements.txt

# Build Rust server
cargo build --release
```

3. **Configure environment**
```bash
cp .env.example .env

# Edit .env with your credentials:
# - OPENAI_API_KEY (required)
# - Circle API credentials
# - Coinbase API key
```

## 🚀 Quick Start

1. **Start all services**
```bash
# Terminal 1: Rust WebSocket server (port 8001) - serves UI and WebSocket
cargo run

# Terminal 2: Python AI service (port 8002)
python3 services/chat_service.py
```

2. **Open the UI**
Navigate to `http://localhost:8001`

3. **Connect your wallet**
- For Ethereum/Base/Avalanche/IoTeX: MetaMask
- For Solana: Solflare (preferred), Phantom, or Backpack

4. **Try a command**
Type a natural language command and watch the real-time execution!

## 🧪 Testing

### Test Files
- `test_all_proofs.js` - Test all 5 proof types
- `test_proof_history.html` - Test proof storage and history
- `test_all_blockchains.html` - Test all blockchain configurations
- `test_usdc_transfers.html` - Test USDC transfer operations
- `test_workflow_simple.js` - Test basic workflow execution

### Running Tests
```bash
# Test workflow execution
node test_workflow_simple.js

# Test full workflow via API
curl -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate KYC proof and verify on Ethereum"}'

# Open HTML test files in browser for UI testing
```

## 📁 Project Structure

```
agentkit/
├── src/                    # Rust WebSocket server
├── services/               # Python AI service
├── parsers/               # Parser modules
│   ├── workflow/          # Workflow parsing logic
│   └── nova/              # Nova proof parsers
├── static/                # Frontend files
│   ├── index.html         # Main UI
│   ├── css/               # Stylesheets
│   ├── js/
│   │   ├── blockchain/    # Blockchain verifiers
│   │   ├── core/         # Core utilities
│   │   ├── device/       # IoT device management
│   │   ├── ui/           # UI components
│   │   └── workflow/     # Workflow management
│   └── parsers/nova/     # Nova parsers (web-accessible copies)
├── circle/               # Circle API integration
├── tests/                # Test files
└── zkengine_binary/      # zkEngine and WASM
```

## 💰 Getting Test Tokens

### Ethereum Sepolia
- [Sepolia Faucet](https://sepoliafaucet.com/)

### Base Sepolia
- [Base Faucet](https://faucet.quicknode.com/base/sepolia)

### Avalanche Fuji
- [Chainlink Fuji Faucet](https://faucets.chain.link/fuji)

### IoTeX Testnet
- [IoTeX Faucet](https://faucet.iotex.io/)

### Solana Devnet
- Run `solana airdrop 2` or use [Sol Faucet](https://solfaucet.com/)

## 🐛 Troubleshooting

### Common Issues
1. **Chat service port** - Now uses port 8002 (not 5000)
2. **Web UI** - Access at http://localhost:8001
3. **IoTeX verification** - Ensure IoTeX testnet is configured in MetaMask
4. **Wallet connection** - Ensure correct network is selected
5. **Proof generation timeout** - Normal for complex proofs (15-30 seconds)

## 📊 Performance

- **Proof generation**: ~15-30 seconds
- **Local verification**: ~2-5 seconds
- **Blockchain verification**: ~10-30 seconds (network dependent)
- **USDC transfers**: ~30-60 seconds for confirmation
- **Supported proof history**: Unlimited (LocalStorage based)

## 🔐 Security & Privacy

- **Zero-Knowledge**: Proofs reveal verification without exposing data
- **On-Chain Immutability**: Verification records permanently stored
- **Unique Proofs**: Timestamp-based uniqueness prevents replay attacks
- **Direct Wallet Signing**: All blockchain operations require user approval

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- **Circle** for the Programmable Wallets API
- **Coinbase** for their API integration
- **IoTeX** for IoT blockchain infrastructure
- zkEngine team for the zero-knowledge proof system
- OpenAI for GPT-4o integration
- The Ethereum, Solana, and broader blockchain communities

---

**Built with ❤️ for the future of verifiable, privacy-preserving compute**