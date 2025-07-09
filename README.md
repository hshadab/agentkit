# Verifiable Agent Kit

A production-ready demonstration of privacy-preserving compliance using real zero-knowledge proofs and multi-chain USDC transfers with intelligent natural language workflow parsing.

## 🚀 Key Features

- **Real Zero-Knowledge Proofs** - Generate cryptographic proofs using NovaNet zkEngine (Nova SNARKs)
- **Multi-Chain USDC Transfers** - Execute real transfers on Ethereum Sepolia and Solana Devnet via Circle API
- **Intelligent Workflow Parsing** - OpenAI-powered understanding of complex multi-step commands
- **Privacy-Preserving KYC** - Prove compliance without revealing personal data
- **Real-Time Updates** - WebSocket-based UI with live transaction status
- **Multi-Person Workflows** - Handle conditional logic for multiple recipients in one command

## 🏗️ Architecture

```
Frontend (Port 8001) ←→ Rust WebSocket Server ←→ Python AI Service (Port 8002)
                              ↓                           ↓
                         zkEngine Binary            Circle API + OpenAI
                         (Nova SNARKs)           (USDC Transfers + NLP)
```

## 🤖 OpenAI Integration (v4.2)

The Verifiable Agent Kit now includes OpenAI integration for intelligent parsing of complex natural language commands:

### Complex Multi-Person Workflows
```bash
# Natural language command
"If Alice is KYC verified send her 0.05 USDC on Solana and if Bob is KYC verified send him 0.03 USDC on Ethereum"

# Automatically generates:
1. Generate KYC proof for Alice
2. Verify KYC proof for Alice  
3. Transfer 0.05 USDC to Alice on Solana (conditional)
4. Generate KYC proof for Bob
5. Verify KYC proof for Bob
6. Transfer 0.03 USDC to Bob on Ethereum (conditional)
```

### Features
- **Intelligent parsing** of complex conditional logic
- **Multi-person support** in a single workflow
- **Natural language variations** understood
- **Automatic fallback** to regex parser if OpenAI unavailable
- **GPT-3.5-turbo** for broad compatibility

## 📋 Prerequisites

- Rust (latest stable)
- Python 3.8+
- Node.js 16+
- Circle API key (get from [Circle Dashboard](https://app.circle.com))
- OpenAI API key

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/hshadab/verifiable-agentkit.git
cd verifiable-agentkit
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env and add your API keys:
# - CIRCLE_API_KEY
# - OPENAI_API_KEY
# - WALLET_ID (your Circle wallet ID)
```

3. **Install dependencies**
```bash
# Python dependencies
python3 -m venv langchain_env
source langchain_env/bin/activate  # On Windows: langchain_env\Scripts\activate
pip install -r requirements.txt

# Node.js dependencies
cd circle && npm install && cd ..

# Rust dependencies (handled automatically by cargo)
```

4. **Start the services**
```bash
# Terminal 1: Rust WebSocket server
cargo run

# Terminal 2: Python AI service
python langchain_service.py
```

5. **Open the UI**
Navigate to http://localhost:8001

## 💬 Usage Examples

### Simple Commands
- "Prove KYC compliance"
- "Send 0.1 USDC to alice" 
- "Verify proof XYZ123"

### Conditional Workflows
- "Send 0.1 USDC to alice on Solana if KYC compliant"
- "If alice is KYC verified then generate location proof then if location verified send 0.05 USDC"

### Multi-Person Complex Workflows
- "If Alice is KYC verified send her 0.05 USDC on Solana and if Bob is KYC verified send him 0.03 USDC on Ethereum"
- "Generate KYC proof for alice then if verified send 0.1 USDC and generate KYC proof for bob then if verified send 0.2 USDC"

### Custom Proofs
Click the 📋 button to paste C code for custom proof generation

## 🔧 Configuration

### Environment Variables
```bash
# Required
CIRCLE_API_KEY=your-circle-api-key
OPENAI_API_KEY=your-openai-api-key
WALLET_ID=your-wallet-id

# Optional
ZKENGINE_BINARY=./zkengine_binary/zkEngine
RUST_LOG=info
```

### Circle Wallet Setup
1. Create wallets on Circle Sandbox for ETH and SOL
2. Fund them with test USDC
3. Add wallet IDs to `.env`

### Test Addresses
- `alice`: Pre-configured ETH/SOL addresses
- `bob`: Pre-configured ETH/SOL addresses  
- `charlie`: Pre-configured ETH/SOL addresses

## 📊 Proof Types

| Type | Description | WASM File |
|------|-------------|-----------|
| KYC | Privacy-preserving compliance | kyc_compliance.wasm |
| AI Content | Verify AI-generated content | ai_content_verification.wasm |
| Location | Device location verification | depin_location.wasm |
| Custom | User-provided C code | Dynamically compiled |

## 🔧 Recent Updates (v4.2)

### UI Improvements
- Fixed duplicate verification cards in workflows
- Fixed transfer polling that wouldn't stop after completion
- Improved real-time workflow status updates

### Parser Enhancements  
- Multi-person conditional transfer support
- Case-insensitive condition matching
- Automatic verification step insertion
- Person-specific proof storage

### Technical Improvements
- Better error handling with graceful fallbacks
- Improved JSON parsing for nested API responses
- OpenAI integration with automatic fallback to regex

## 🐛 Troubleshooting

### Circle API Issues
```bash
cd circle && node test-circle.js  # Test connection and balances
```

### Missing Transaction Links
- Transfers take 10-60 seconds to get blockchain confirmation
- UI will automatically poll and update when tx hash is available

### Decimal Precision Errors
- USDC only supports 2 decimal places
- System automatically rounds (e.g., 0.033 → 0.03)

### OpenAI Integration
- Ensure your API key has access to GPT-3.5-turbo
- Complex workflows automatically use OpenAI parsing
- Falls back to regex parser if OpenAI fails

### Service Not Updating
- Python service may need restart after code changes
- Kill and restart `python langchain_service.py`

## 🔍 Debug Mode
Press `Ctrl+Shift+D` in the UI to toggle debug console

## 📚 Architecture Note

Despite the filename `langchain_service.py`, this service uses direct OpenAI API calls rather than LangChain. This design choice keeps the integration simple and focused on the core functionality of parsing workflows for zkEngine execution.

## 📖 Documentation

See [TECHNICAL_SPEC.md](TECHNICAL_SPEC.md) for detailed architecture and implementation details.

## 🤝 Contributing

Contributions welcome! Please open an issue first to discuss proposed changes.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [NovaNet](https://www.novanet.xyz/) for zkEngine
- [Circle](https://www.circle.com/) for USDC API
- [OpenAI](https://openai.com/) for GPT integration