# Verifiable Agent Kit

A production-ready demonstration of privacy-preserving compliance using real zero-knowledge proofs and multi-chain USDC transfers.

## 🚀 Key Features

- **Real Zero-Knowledge Proofs** - Generate cryptographic proofs using NovaNet zkEngine (Nova SNARKs)
- **Multi-Chain USDC Transfers** - Execute real transfers on Ethereum Sepolia and Solana Devnet via Circle API
- **Natural Language Interface** - Interact using plain English powered by GPT-4o-mini
- **Privacy-Preserving KYC** - Prove compliance without revealing personal data
- **Real-Time Updates** - WebSocket-based UI with live transaction status

## 🏗️ Architecture

```
Frontend (Port 8001) ←→ Rust WebSocket Server ←→ Python AI Service (Port 8002)
                              ↓                           ↓
                         zkEngine Binary            Circle API
                         (Nova SNARKs)           (USDC Transfers)
```

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

### Generate Zero-Knowledge Proofs
- "Prove KYC compliance"
- "Prove AI content authenticity" 
- "Prove location: NYC (40.7°, -74.0°)"

### Execute USDC Transfers
- "Send 0.1 USDC to alice" (direct transfer)
- "Send 0.1 USDC to alice on Solana if KYC compliant" (with proof)

### Custom Proofs
Click the 📋 button to paste C code for custom proof generation

## 🔧 Configuration

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

## 🐛 Troubleshooting

### Circle API Issues
```bash
cd circle && node test-real-mode.js  # Test connection and balances
```

### Missing Transaction Links
- Transfers take 10-60 seconds to get blockchain confirmation
- UI will automatically poll and update when tx hash is available

### Decimal Precision Errors
- USDC only supports 2 decimal places
- System automatically rounds (e.g., 0.033 → 0.03)

## 🔍 Debug Mode
Press `Ctrl+Shift+D` in the UI to toggle debug console

## 📚 Documentation

See [TECHNICAL_SPEC.md](TECHNICAL_SPEC.md) for detailed architecture and implementation details.

## 🤝 Contributing

Contributions welcome! Please open an issue first to discuss proposed changes.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [NovaNet](https://www.novanet.xyz/) for zkEngine
- [Circle](https://www.circle.com/) for USDC API
- [OpenAI](https://openai.com/) for GPT-4o-mini
