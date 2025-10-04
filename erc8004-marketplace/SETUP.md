# 🚀 Setup Guide - ERC-8004 zkML Agent Auditor

Complete guide to deploy and run the NovaNet zkML Agent Auditor service.

---

## Prerequisites

### 1. Required Software
- Node.js v18+ and npm
- Hardhat
- MetaMask browser extension
- Base Sepolia testnet ETH (~0.01 ETH for deployment)

### 2. Required Services
- **JOLT-Atlas Proof Service** (port 9001) - Already deployed
  - Location: `/home/hshadab/agentkit/acp/services/proof-service.js`
  - Must be running before starting backend

### 3. Get Testnet Assets
- **Base Sepolia ETH**: https://faucet.quicknode.com/base/sepolia
- **Base Sepolia USDC**: https://faucet.circle.com/
  - Contract: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

---

## Step 1: Environment Setup

Create `.env` file in project root:

```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env
```

Required variables:
```bash
# Network
BASE_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=your_private_key_here  # DO NOT COMMIT

# Contracts (already deployed)
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
GROTH16_VERIFIER=0xf752509cb5af017f465B42053d41B730991c6624

# Treasury (your wallet for collecting fees)
TREASURY_ADDRESS=your_treasury_address_here

# Services
PROOF_SERVICE_URL=http://localhost:9001
BACKEND_PORT=9002

# Optional: Block Explorer
BASESCAN_API_KEY=your_api_key_here
```

---

## Step 2: Install Dependencies

```bash
npm install
```

This installs:
- Hardhat + toolbox
- OpenZeppelin contracts
- Express + CORS
- Ethers.js v6
- Axios
- Dotenv

---

## Step 3: Compile Contracts

```bash
npm run compile
```

This compiles:
- `contracts/interfaces/IERC8004ValidationRegistry.sol`
- `contracts/ZkMLValidationRegistry.sol`

Output: `artifacts/` directory

---

## Step 4: Deploy Registry Contract

```bash
npm run deploy:baseSepolia
```

Expected output:
```
🚀 Deploying zkML Agent Auditor to Base Sepolia...

📋 Deployment Configuration:
   USDC Token: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
   Groth16 Verifier: 0xf752509cb5af017f465B42053d41B730991c6624
   Treasury: 0xYourAddress

📝 Deploying ZkMLValidationRegistry...
✅ ZkMLValidationRegistry deployed to: 0xNewContractAddress

🔐 Authorizing deployer as validator...
✅ Deployer authorized as validator

💾 Deployment info saved to deployments.json
```

**Important**: Save the deployed contract address!

---

## Step 5: Start Services

You need **3 terminals**:

### Terminal 1: JOLT-Atlas Proof Service (port 9001)
```bash
cd /home/hshadab/agentkit/acp/services
node proof-service.js
```

Expected output:
```
🔐 JOLT-Atlas Proof Service
   Port: 9001
   Model: authorization_model.onnx
   JOLT Binary: Ready
```

### Terminal 2: Backend Service (port 9002)
```bash
cd /home/hshadab/agentkit/erc8004-zkml-auditor
npm run backend
```

Expected output:
```
🚀 zkML Agent Auditor Backend
   Port: 9002
   Registry: 0xYourDeployedAddress
   Network: Base Sepolia
   Proof Service: http://localhost:9001

Endpoints:
   POST   http://localhost:9002/submit-agent
   POST   http://localhost:9002/generate-proof
   POST   http://localhost:9002/finalize-validation
   GET    http://localhost:9002/validation-status/:sessionId
   GET    http://localhost:9002/health
```

### Terminal 3: UI Server (port 9003)
```bash
npm run ui
```

Expected output:
```
🌐 zkML Agent Auditor UI
   Port: 9003
   URL: http://localhost:9003
```

---

## Step 6: Configure MetaMask

### Add Base Sepolia Network
- Network Name: `Base Sepolia`
- RPC URL: `https://sepolia.base.org`
- Chain ID: `84532`
- Currency: `ETH`
- Explorer: `https://sepolia.basescan.org`

### Get Test USDC
1. Visit https://faucet.circle.com/
2. Select "Base Sepolia"
3. Enter your wallet address
4. Claim 10 USDC (takes ~1 minute)

---

## Step 7: Test the Workflow

### Via UI (http://localhost:9003)

1. **Connect Wallet**
   - Click "Connect Wallet"
   - Approve MetaMask connection
   - Verify Base Sepolia network

2. **Submit Agent**
   - Agent Name: "TradingBot v1"
   - Description: "AI trading agent for DeFi"
   - Click "Submit Agent"

3. **Approve USDC**
   - Click "Approve USDC"
   - Confirm MetaMask transaction
   - Wait for confirmation

4. **Pay Validation Fee**
   - Click "Pay & Request Validation"
   - Confirm 2 USDC payment
   - Transaction recorded on-chain

5. **Generate Proof**
   - Click "Generate Proof"
   - JOLT-Atlas generates zkML proof (~600ms)
   - View decision, confidence, score

6. **Finalize Validation**
   - Click "Finalize Validation"
   - Backend submits proof to registry
   - Receive validation certificate

### Via Backend API

```bash
# 1. Submit agent
curl -X POST http://localhost:9002/submit-agent \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "TestAgent",
    "agentDescription": "Test agent for validation"
  }'

# Response:
# {
#   "success": true,
#   "sessionId": "0x1234...",
#   "agentId": "0xabcd...",
#   "dataHash": "0x5678...",
#   "validationFee": "2000000"
# }

# 2. Generate proof
curl -X POST http://localhost:9002/generate-proof \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "0x1234..."}'

# 3. Check status
curl http://localhost:9002/validation-status/0x1234...
```

---

## Step 8: Verify On-Chain

### Via BaseScan
1. Go to https://sepolia.basescan.org/
2. Search for your registry contract address
3. View "Events" tab
4. Look for:
   - `ValidationRequest` event
   - `ValidationResponse` event
   - `ProofVerified` event

### Via Etherscan API
```bash
curl "https://api-sepolia.basescan.org/api\
?module=logs\
&action=getLogs\
&address=0xYourRegistryAddress\
&topic0=0xValidationRequestEventTopic\
&apikey=YourAPIKey"
```

---

## Troubleshooting

### Backend won't start
**Error**: "Cannot find module 'express'"
```bash
npm install
```

**Error**: "RPC timeout"
- Check `.env` has valid `BASE_RPC_URL`
- Try alternative RPC: `https://base-sepolia-rpc.publicnode.com`

### Proof generation fails
**Error**: "Proof service unavailable"
```bash
# Check proof service is running
curl http://localhost:9001/health

# If not, start it:
cd /home/hshadab/agentkit/acp/services
node proof-service.js
```

### MetaMask issues
**Error**: "User rejected transaction"
- Check wallet has sufficient ETH for gas (~0.001 ETH)
- Check wallet has 2 USDC for validation fee

**Error**: "Wrong network"
```javascript
// In MetaMask, switch to Base Sepolia manually
// Or click "Switch Network" in the UI
```

### USDC approval fails
**Error**: "Insufficient allowance"
```bash
# Check USDC balance
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  "balanceOf(address)(uint256)" YOUR_ADDRESS \
  --rpc-url https://sepolia.base.org

# If balance is 0, get testnet USDC from faucet
```

---

## Production Deployment

### 1. Deploy to VPS/Cloud
Recommended: Railway, Render, DigitalOcean

```bash
# Backend
railway up backend/

# UI (optional - can use Vercel for frontend)
vercel deploy ui/
```

### 2. Environment Variables
Set in production:
- `BASE_RPC_URL`: Use Alchemy/Infura for reliability
- `PRIVATE_KEY`: Use encrypted secrets manager
- `TREASURY_ADDRESS`: Multi-sig wallet recommended

### 3. Rate Limiting
Add to backend:
```javascript
const rateLimit = require('express-rate-limit');
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100 // limit per IP
}));
```

### 4. Monitoring
- Uptime: UptimeRobot
- Errors: Sentry
- Analytics: Mixpanel

---

## Cost Breakdown

### Development (Testnet)
- Deployment: ~0.005 ETH ($12)
- Testing: Free (testnet USDC from faucet)
- Hosting: $0 (local)

### Production (Mainnet)
- Deployment: ~0.01 ETH (~$25)
- Per validation: 2 USDC user fee
- Gas per finalize: ~0.0003 ETH (~$0.75)
- Hosting: $5-20/month (backend + UI)
- RPC: Free tier (Alchemy/Infura)

**Profit per validation**: $2.00 - $0.75 = **$1.25 net**

---

## Next Steps

### MVP Launch Checklist
- [ ] Deploy to Base Sepolia testnet
- [ ] Run 10 successful validations
- [ ] Document any bugs
- [ ] Create demo video
- [ ] Write Twitter thread
- [ ] Submit to ERC-8004 discussion forum

### Production Roadmap
1. **Week 1-2**: Beta testing with 5-10 agents
2. **Week 3-4**: Deploy to Base mainnet
3. **Week 5-6**: Launch marketing campaign
4. **Week 7-8**: Present at Devconnect Buenos Aires (Nov 2025)

### Revenue Targets
- **Month 1**: 50 validations = $62.50
- **Month 3**: 500 validations = $625
- **Month 6**: 2000 validations = $2,500
- **Year 1**: 10,000 validations = $12,500

---

## Support

- **Issues**: Open GitHub issue
- **ERC-8004 Spec**: https://eips.ethereum.org/EIPS/eip-8004
- **NovaNet Docs**: https://novanet.xyz/docs
- **Base Sepolia Explorer**: https://sepolia.basescan.org

---

**Ready to revolutionize AI agent trust with zkML proofs! 🚀**
