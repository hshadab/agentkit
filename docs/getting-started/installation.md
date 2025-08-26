# AgentKit Setup Guide

## Prerequisites

### System Requirements
- **OS**: Linux, macOS, or Windows with WSL2
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB free space
- **Network**: Stable internet connection

### Software Requirements
- **Rust**: 1.70 or higher
- **Python**: 3.8 or higher
- **Node.js**: 18.0 or higher
- **Git**: 2.0 or higher

## Step-by-Step Installation

### 1. Install System Dependencies

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install -y build-essential curl git python3-pip
```

**macOS**:
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install python@3 node
```

**Windows** (use WSL2):
```bash
wsl --install
# Then follow Ubuntu instructions inside WSL2
```

### 2. Install Rust

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add to PATH
source $HOME/.cargo/env

# Verify installation
rustc --version
cargo --version
```

### 3. Install Node.js (if not already installed)

**Using Node Version Manager (recommended)**:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 4. Clone the Repository

```bash
git clone https://github.com/yourusername/agentkit.git
cd agentkit
```

### 5. Install Dependencies

**Node.js dependencies**:
```bash
npm install
```

**Python dependencies**:
```bash
pip install -r requirements.txt
```

**Build Rust server**:
```bash
cargo build --release
```

### 6. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your preferred editor
nano .env  # or vim, code, etc.
```

**Required Configuration**:
```env
# OpenAI API Key (REQUIRED)
OPENAI_API_KEY=sk-your-actual-api-key-here

# Circle API (for USDC transfers)
CIRCLE_API_KEY=your_circle_api_key
CIRCLE_ETH_WALLET_ID=your_ethereum_wallet_id  
CIRCLE_SOL_WALLET_ID=your_solana_wallet_id

# Coinbase API (alternative USDC transfers)
COINBASE_API_KEY=your_coinbase_api_key

# zkEngine Path (default is correct)
ZKENGINE_BINARY=./zkengine_binary/zkEngine

# Service Ports (defaults are fine)
PORT=8001                    # Rust WebSocket server (also serves static files)
CHAT_SERVICE_PORT=8002       # Python AI service
```

### 7. Get API Keys

#### OpenAI API Key (Required)
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy and paste into `.env`

#### Circle API (Optional - for USDC transfers)
1. Sign up at https://console.circle.com/
2. Create sandbox account
3. Generate API key and wallet IDs
4. Add to `.env`

#### Coinbase API (Optional - for USDC transfers)
1. Sign up at https://www.coinbase.com/cloud
2. Create API key
3. Add to `.env`

### 8. Setup Blockchain Wallets

#### MetaMask (for EVM chains)
1. Install MetaMask browser extension
2. Create or import wallet
3. Add test networks:
   - Ethereum Sepolia
   - Base Sepolia (Chain ID: 84532)
   - Avalanche Fuji (Chain ID: 43113)
   - IoTeX Testnet (Chain ID: 4690)

#### Solflare (for Solana)
1. Install Solflare browser extension
2. Create or import wallet
3. Switch to Devnet

### 9. Get Test Tokens

**Ethereum Sepolia**:
```bash
# Visit https://sepoliafaucet.com/
# Enter your wallet address
```

**Base Sepolia**:
```bash
# Visit https://faucet.quicknode.com/base/sepolia
# Or bridge from Ethereum Sepolia
```

**Avalanche Fuji**:
```bash
# Visit https://faucets.chain.link/fuji
```

**IoTeX Testnet**:
```bash
# Visit https://faucet.iotex.io/
```

**Solana Devnet**:
```bash
# If you have Solana CLI:
solana airdrop 2

# Or visit https://solfaucet.com/
```

## Running the Application

### Start All Services

**Terminal 1** - Rust WebSocket Server:
```bash
cargo run
# Should see: "🚀 Server listening on 0.0.0.0:8001"
```

**Terminal 2** - Python AI Service:
```bash
python3 services/chat_service.py
# Should see: "🔗 Listening on http://localhost:8002"
```

### Access the Application

Open your browser and navigate to:
```
http://localhost:8001
```

## Verification Steps

### 1. Test WebSocket Connection
- Open browser console (F12)
- Should see: "WebSocket connected"

### 2. Test Proof Generation
Type in the chat:
```
Generate a KYC proof and verify locally
```

### 3. Test Blockchain Connection
- Click wallet connect buttons
- Approve connection in MetaMask/Solflare

### 4. Test Full Workflow
```
Generate KYC proof and verify on Ethereum
```

## Common Issues & Solutions

### Issue: "OPENAI_API_KEY not found"
**Solution**: Make sure `.env` file exists and contains valid OpenAI key

### Issue: "Cannot connect to WebSocket"
**Solution**: 
1. Check if Rust server is running on port 8001
2. Check browser console for CORS errors
3. Try refreshing the page

### Issue: "Module not found" errors
**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Issue: "Rust build fails"
**Solution**:
```bash
# Update Rust
rustup update
cargo clean
cargo build --release
```

### Issue: "Python import errors"
**Solution**:
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Advanced Configuration

### Custom Ports
Edit `.env`:
```env
PORT=8081                    # Change Rust server port
CHAT_SERVICE_PORT=8082       # Change AI service port
```

### Production Setup
1. Use reverse proxy (nginx/Apache)
2. Setup SSL certificates
3. Configure firewall rules
4. Enable process managers (pm2/systemd)
5. Setup monitoring

### Docker Setup (Coming Soon)
```bash
docker-compose up -d
```

## Testing the Installation

Run the test suite:
```bash
# Test proof generation
node test_workflow_simple.js

# Test all components
node test_all_proofs.js
```

Open test pages in browser:
- http://localhost:8000/test_proof_history.html
- http://localhost:8000/test_all_blockchains.html
- http://localhost:8000/test_usdc_transfers.html

## Next Steps

1. Review [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system
2. Try example commands from [README.md](README.md)
3. Explore the codebase structure
4. Join our community for support

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Review logs in browser console and terminal
3. Search existing GitHub issues
4. Create a new issue with details

Happy building with AgentKit! 🚀