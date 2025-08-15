# Verifiable Agent Kit

A production-ready framework for privacy-preserving AI agents with real zero-knowledge proofs using zkEngine Nova recursive proofs. Features multi-chain verification, automated USDC transfers, and complete IoTeX DePIN integration with real on-chain device registration, proximity verification, and reward distribution. Build trustless, verifiable compute applications using natural language commands.

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

#### 2. **Device Proximity Proof** (IoT Integration) 🔥
Proves IoT device location and proximity for IoTeX blockchain with real Nova recursive SNARKs.
- **Complete Workflow**: Device Registration (0.01 IOTX) → Nova Proof Generation → Blockchain Verification (0.001 IOTX) → Reward Distribution (0.1 IOTX)
- **Live Smart Contract**: Deployed on IoTeX Testnet with 110.5 IOTX reward pool
- **Features**: Real on-chain transactions, ioID DID generation, W3C-compliant identity, MetaMask integration
- **Use cases**: Smart city applications, supply chain tracking, DePIN verification, decentralized device identity (DID)
- **Blockchain**: IoTeX with ProximityNovaDecider
- **IoTeX Integration**: Official ioID Registry for device DIDs, Nova Decider for proof verification
- **Example**: `"Register IoT device TESTDEV123 with proximity proof at location 5050,5050"`

#### 3. **AI Prediction Proof**
Proves AI predictions were made before events occurred with blockchain timestamps.
- **Use cases**: Trading predictions, weather forecasting, outcome verification
- **Blockchain**: Base with commitment contract
- **Base Integration**: Coinbase Developer Platform SDK, low-cost L2 for high-volume predictions
- **Example**: `"Generate an AI prediction proof that Bitcoin will reach $100k by end of 2025"`

#### 4. **Medical Integrity Proof**
Proves medical record integrity and patient data validity without exposing sensitive information.
- **Use cases**: Healthcare data verification, clinical trial integrity, patient privacy, HIPAA compliance
- **Blockchain**: Avalanche Fuji
- **Avalanche Integration**: High-throughput C-Chain, sub-second finality for medical applications
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

### 🔐 Blockchain Verification Approaches

Our system implements distinct verification approaches tailored to each blockchain's unique architecture:

#### **IoTeX Device Location Verification (Nova-based)**
- **Proof System**: Nova recursive SNARK proofs with complex multi-component structure
- **Contract Method**: `verifyDeviceProximity()` with 11 parameters including:
  - Nova folding components (i_z0_zi, U_i_cmW_U_i_cmE, u_i_cmW, cmT_r)
  - Groth16 proof elements (pA, pB, pC)
  - KZG commitment proofs (challenge_W_challenge_E_kzg_evals, kzg_proof)
- **Unique Features**:
  - Device pre-registration via `registerDevice()`
  - Built-in IOTX reward mechanism for proximity proofs
  - Stateful verification tracking device history
  - ~2M gas due to Nova verification complexity
- **Use Case**: IoT device proximity verification for DePIN applications

#### **EVM Chains (Ethereum, Base, Avalanche) - Groth16 Verification**
- **Proof System**: Standard Groth16 proofs with streamlined structure
- **Contract Method**: `verifyProof()` with 4 parameters:
  - _pA: uint256[2]
  - _pB: uint256[2][2]
  - _pC: uint256[2]
  - _pubSignals: uint256[6]
- **Features**:
  - Direct verification without registration
  - Stateless cryptographic validation
  - ~300K gas typical usage
  - General-purpose ZK proof verification
- **Use Cases**: KYC, AI predictions, medical records, any computation proof

#### **Solana - Program-Based Verification**
- **Proof System**: Custom Solana program with instruction-based verification
- **Architecture**: 
  - Uses Solana's account model with Program Derived Addresses (PDAs)
  - Instruction data contains serialized proof components
  - Parallel transaction processing for high throughput
- **Unique Implementation**:
  - No smart contracts - uses native Solana programs
  - Proof data stored in transaction logs
  - Sub-second finality with ~5000 TPS capacity
  - Cost: ~0.00025 SOL per verification
- **Integration**: Solflare/Phantom wallet with Web3.js
- **Use Cases**: High-frequency verifications, micropayments, gaming proofs

### 🔄 Deep Circle API Integration

This project represents one of the most comprehensive Circle API integrations, combining programmable wallets, USDC transfers, and cross-chain capabilities with zero-knowledge proof verification.

#### **Architecture Overview**
```
AI Agent → ZK Proof Generation → Blockchain Verification → Circle API → USDC Transfer
```

#### **Circle Technologies Integrated**

##### **1. Programmable Wallets API**
- **Developer-Controlled Wallets**: Create and manage wallets programmatically
- **Wallet Sets**: Organized wallet management with UUID-based identification
- **Multi-Chain Support**: Simultaneous Ethereum and Solana wallet operations
- **Implementation**: Full wallet lifecycle management in `circle/circleAccountsHandler.js`

##### **2. Cross-Chain Transfer Protocol (CCTP)**
- **USDC Bridging**: Move USDC between Ethereum ↔ Avalanche
- **Attestation Monitoring**: Real-time tracking via Circle's attestation service
- **Message Verification**: Cryptographic proof of cross-chain transfers
- **Use Case**: Verify proof on one chain, pay on another

##### **3. Transfer Automation**
- **Conditional Logic**: ZK proof verification triggers automatic transfers
- **Natural Language Processing**: Convert commands to transfer operations
- **Batch Operations**: Multiple transfers in single workflow
- **Example Flow**:
  ```javascript
  // Actual implementation from workflowExecutor.js
  if (step.type === 'verify_proof' && verificationResult.success) {
    // Trigger Circle transfer based on verification
    await circleHandler.createTransfer({
      walletId: sourceWallet,
      amounts: [step.transferAmount],
      destinationAddress: recipientAddress,
      blockchain: targetBlockchain
    });
  }
  ```

#### **Integration Features**

##### **Authentication & Security**
- **API Key Management**: Secure storage in environment variables
- **Entity Secret Encryption**: All sensitive operations encrypted
- **Idempotency Keys**: Prevent duplicate transfers
- **Error Recovery**: Comprehensive retry logic with exponential backoff

##### **Workflow Pipeline**
1. **AI Processing**: OpenAI GPT-4o parses natural language commands
2. **Proof Generation**: zkEngine creates cryptographic proofs
3. **Blockchain Verification**: Deploy proofs to 5 different chains
4. **Circle Wallet Selection**: Intelligent wallet routing
5. **USDC Transfer Execution**: Automated conditional transfers
6. **Status Monitoring**: Real-time transfer tracking

##### **Advanced Capabilities**
- **Multi-Step Workflows**: Complex conditions with multiple proofs
- **Cross-Chain Logic**: Verify on Ethereum, pay on Solana
- **Balance Management**: Real-time balance checking before transfers
- **Gas Abstraction**: Circle handles all gas fees
- **Transaction History**: Complete audit trail with blockchain links

#### **Real Implementation Examples**

```javascript
// From our production code:

// 1. Create programmable wallet
const wallet = await circleHandler.createWallet({
  blockchain: "ETH-SEPOLIA",
  walletSetId: config.circle.walletSetId
});

// 2. Execute conditional transfer after ZK verification
const transferResult = await executeTransfer({
  sourceWalletId: wallet.id,
  destinationAddress: recipientAddress,
  amount: "10.00",
  condition: proofVerified,
  blockchain: "ETH-SEPOLIA"
});

// 3. Monitor transfer status
const status = await circleHandler.getTransferStatus(transferResult.id);
```

#### **Why This Integration Stands Out**
1. **First-of-its-kind**: ZK proofs triggering USDC transfers
2. **Production-Ready**: Complete error handling and monitoring
3. **Natural Language**: Non-technical users can specify transfer logic
4. **Multi-Chain Native**: Not just support, but cross-chain orchestration
5. **Open Source**: Full implementation for developers to build upon

## 🏗️ Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   Frontend UI       │────▶│  Rust WebSocket      │────▶│ zkEngine Binary     │
│  (localhost:8001)   │◀────│  Server (Port 8001)  │◀────│ (Nova → Groth16)    │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
         │                           │                             │
         ▼                           ▼                             ▼
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│ Blockchain SDKs     │     │ Python AI Service    │     │ Platform APIs       │
│ • MetaMask (EVM)    │     │ • OpenAI GPT-4o      │     │ • Circle SDK        │
│ • Solflare (Solana) │     │ • Workflow Parser    │     │ • Coinbase SDK      │
│ • IoTeX SDK         │     │ • Port 8002          │     │ • Avalanche Core    │
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

### Complex Multi-Step Workflow with Circle Integration
```
"Create KYC proof for Alice, verify on chain, then create age proof over 21, and if both valid send 5 USDC to Alice"
```

### Circle-Specific Commands
```
"Generate medical proof and if verified on Avalanche, transfer 10 USDC from Ethereum wallet to Bob's Solana address"
```
```
"Create AI prediction proof, commit on Base, and schedule 1 USDC transfer to predictor when outcome is verified"
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

## 🔌 Key Integrations

### Circle Developer Platform (Deep Integration)

#### Programmable Wallets Implementation
- **Developer-Controlled Wallets**: Full implementation of Circle's developer-controlled wallet infrastructure
- **Multi-Chain Architecture**: Simultaneous Ethereum and Solana wallet management with unified interface
- **Wallet Set Management**: Organized wallet sets with UUID-based identification system
- **Entity Secret Handling**: Secure encryption/decryption of sensitive operations using Circle's entity secret

#### Advanced Transfer Features
- **Conditional Transfer Logic**: Smart contract verification triggers automated USDC transfers
- **Cross-Chain Transfer Support**: Seamless USDC transfers between Ethereum and Solana networks
- **Idempotency Implementation**: Unique request IDs prevent duplicate transfers
- **Gas Fee Abstraction**: Circle handles gas fees, simplifying user experience

#### Real-Time Transaction Monitoring
- **Transfer Status Polling**: Automated status checking with exponential backoff
- **Webhook Integration Ready**: Architecture supports Circle webhooks for instant updates
- **Transaction State Machine**: Tracks transfers through pending → complete → failed states
- **Blockchain Explorer Integration**: Direct links to Etherscan/Solana Explorer for transparency

#### Production-Ready Features
- **Error Handling**: Comprehensive error recovery for network issues and failed transfers
- **Balance Management**: Real-time balance checking before transfer execution
- **Multi-Recipient Support**: Batch transfer capabilities for complex workflows
- **Audit Trail**: Complete transfer history with blockchain confirmations

#### Implementation Depth
```javascript
// Real code from our Circle integration:
- circleHandler.js: Full transfer lifecycle management with retry logic
- executeTransfer.js: Atomic transfer execution with state tracking
- workflowManager.js: AI-driven conditional transfer orchestration
- recipientResolver.js: Intelligent address validation and aliasing
- circleAccountsHandler.js: Wallet creation and balance management
```

#### Circle API Usage Statistics
- **API Endpoints Used**: 15+ different Circle endpoints
- **Transfer Types**: Single, batch, cross-chain, conditional
- **Error Handling**: 25+ specific error cases handled
- **Status Codes**: Full implementation of Circle's status model

#### Why This Integration Stands Out
1. **First-of-its-kind**: ZK proof verification triggering USDC transfers
2. **Natural Language**: Non-technical users can specify complex transfer logic
3. **Production-Ready**: Complete error handling, retries, and monitoring
4. **Multi-Chain Native**: Not just multi-chain support, but cross-chain logic
5. **Open Source**: Full implementation available for Circle developers to build upon

### IoTeX Blockchain
- **ioID Registry**: Official decentralized identity (DID) system for IoT devices
- **Nova Decider**: Real cryptographic verification for device proximity proofs
- **Use Cases**: DePIN applications, smart cities, supply chain, device authentication

### Base (Coinbase L2)
- **SDK**: Coinbase Developer Platform SDK
- **Features**: Low-cost AI prediction commitments, high throughput
- **Use Cases**: AI model predictions, trading strategies, content verification

### Avalanche
- **Integration**: Avalanche Core API for sub-second finality
- **Features**: High-throughput medical data verification
- **Use Cases**: Healthcare records, clinical trials, HIPAA-compliant data proofs

## 🙏 Acknowledgments

- **Circle** for the Developer Platform and Web3 Services SDK
- **Coinbase** for Base L2 and Developer Platform
- **IoTeX** for DePIN infrastructure and ioID DID system
- **Avalanche** for high-performance blockchain infrastructure
- zkEngine team for the Nova recursive proof system
- OpenAI for GPT-4o integration
- The Ethereum, Solana, and broader blockchain communities

---

**Built with ❤️ for the future of verifiable, privacy-preserving compute**