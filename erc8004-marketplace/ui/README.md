# zkML Agent Auditor Dashboard

Modern, responsive UI dashboard for the zkML Agent Auditor service with ERC-8004 validation.

## 🎨 Features

- **Modern Design**: Glassmorphism effects with gradient backgrounds
- **Real-time Updates**: Live status updates during proof generation
- **Wallet Integration**: MetaMask connection with Base Sepolia
- **FREE Validation**: No payment required - completely free on testnet! 🎉
- **3-Step Workflow**:
  1. Connect Wallet
  2. Submit Agent Info + Generate zkML Proof (JOLT-Atlas ~600ms)
  3. Finalize On-Chain Validation
- **Validation Certificate**: Display with score, TX hash, and BaseScan links
- **History Tracking**: LocalStorage-based validation history
- **Stats Dashboard**: Total validations, proof time, zkML system

## 📁 File Structure

```
ui/
├── index.html           # Main dashboard HTML
├── css/
│   └── styles.css      # Comprehensive styling with glassmorphism
├── js/
│   └── app.js          # Frontend logic with ethers.js
├── server.js           # Express server (port 9003)
└── README.md           # This file
```

## 🚀 Quick Start

### Prerequisites

1. **Backend API** running on port 9002 (pays all gas costs)
2. **JOLT-Atlas proof service** on port 9001
3. **MetaMask** browser extension
4. ~~**Base Sepolia ETH**~~ ❌ NOT NEEDED - Completely gasless!
5. ~~**Test USDC**~~ ❌ NOT NEEDED - 100% FREE!

### Start the UI Server

```bash
cd /home/hshadab/agentkit/erc8004-zkml-auditor/ui
node server.js
```

### Access the Dashboard

Open your browser and navigate to:
```
http://localhost:9003
```

## 📦 Deployed Contracts

All contracts are deployed on **Base Sepolia** testnet:

| Contract | Address | Explorer |
|----------|---------|----------|
| **Registry** | `0xF86630d38fd30dE173A7548806e1f12522dC5E27` | [View](https://sepolia.basescan.org/address/0xF86630d38fd30dE173A7548806e1f12522dC5E27) |
| **Groth16 Verifier** | `0xf752509cb5af017f465B42053d41B730991c6624` | [View](https://sepolia.basescan.org/address/0xf752509cb5af017f465B42053d41B730991c6624) |
| **USDC** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | [View](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e) |

## 🔄 User Workflow (Completely Gasless!)

### 1. Connect Wallet
- Click "Connect Wallet" button
- MetaMask prompts to connect
- Switch to Base Sepolia if needed
- ✅ **NO TOKENS NEEDED** - wallet can be empty!

### 2. Submit Agent Info
- Enter agent name (e.g., "TravelDealHunter")
- Provide description
- Enter model hash (bytes32 format: `0x...`)
- Click "Submit Agent for Validation"

### 3. Automatic Processing (Backend handles everything!)
The backend automatically:

**Step 1: Generate zkML Proof**
- JOLT-Atlas proof generation (~600ms)
- Score calculated (0-100)
- ✅ **You pay gas**, not the user!

**Step 2: Submit to Blockchain**
- Backend submits validation response
- Backend submits zkML proof
- On-chain verification via Groth16
- ✅ **You pay gas**, not the user!

### 4. Validation Certificate
- Displays agent name, score, model hash
- Links to BaseScan transaction
- Timestamp of validation
- Download certificate as JSON

## 💰 Cost Breakdown (Provider pays)
- Validation fee: **FREE** (set to 0)
- Gas per validation: **~$0.02** (you cover this)
- User cost: **$0.00** 🎉

## 🎯 Model Hash Generation

The model hash should be a SHA256 hash of your model weights:

```javascript
// Example: Generate model hash
const crypto = require('crypto');
const modelWeights = Buffer.from('your_model_weights_here');
const modelHash = '0x' + crypto.createHash('sha256').update(modelWeights).digest('hex');
console.log(modelHash); // 0x...
```

Or use a test hash:
```
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

## 🔧 Configuration

Edit `js/app.js` to change configuration:

```javascript
const CONFIG = {
    BACKEND_URL: 'http://localhost:9002',
    REGISTRY_ADDRESS: '0xF86630d38fd30dE173A7548806e1f12522dC5E27',
    USDC_ADDRESS: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    VERIFIER_ADDRESS: '0xf752509cb5af017f465B42053d41B730991c6624',
    BASE_SEPOLIA_CHAIN_ID: '0x14A34', // 84532
    VALIDATION_FEE: '2000000', // 2 USDC (6 decimals)
};
```

## 🎨 Design System

### Colors
- **Primary**: `#6366f1` (Indigo)
- **Secondary**: `#8b5cf6` (Purple)
- **Success**: `#10b981` (Green)
- **Danger**: `#ef4444` (Red)
- **Warning**: `#f59e0b` (Amber)
- **Info**: `#3b82f6` (Blue)

### Typography
- Font: System font stack (San Francisco, Segoe UI, Roboto)
- Headings: 700 weight
- Body: 400 weight
- Monospace: Courier New (for hashes)

### Effects
- **Glassmorphism**: `backdrop-filter: blur(10px)`
- **Shadows**: Multi-layer box shadows
- **Gradients**: 135deg linear gradients
- **Animations**: Smooth transitions (0.3s ease)

## 📱 Responsive Design

The UI is fully responsive with breakpoints at:
- **Desktop**: > 768px (grid layout)
- **Mobile**: < 768px (stacked layout)

Mobile adjustments:
- Vertical wallet info
- Single column stats grid
- Full-width buttons
- Adjusted padding

## 🔐 Security Features

1. **Directory Traversal Protection**: Path normalization
2. **CORS**: Configured for localhost development
3. **Input Validation**: Pattern matching for model hash
4. **Network Verification**: Ensures Base Sepolia
5. **Transaction Confirmations**: Waits for on-chain confirmation

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 9003
lsof -ti:9003 | xargs kill -9
```

### MetaMask Not Connecting
1. Ensure MetaMask is unlocked
2. Check Base Sepolia is added to networks
3. Clear browser cache
4. Refresh page

### Insufficient USDC
Get testnet USDC from:
- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
- Or contact the team for test tokens

### Backend Not Running
```bash
# Start backend on port 9002
cd /home/hshadab/agentkit/erc8004-zkml-auditor/backend
node server.js
```

## 📊 API Endpoints Used

The UI interacts with these backend endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/submit-agent` | POST | Submit agent info |
| `/generate-proof` | POST | Generate zkML proof |
| `/finalize-validation` | POST | Finalize on-chain |
| `/status/:sessionId` | GET | Get session status |

## 🚧 Development

### Local Development
```bash
# Watch for changes (requires nodemon)
npm install -g nodemon
nodemon server.js
```

### Testing
```bash
# Test all endpoints
curl http://localhost:9003/
curl http://localhost:9003/css/styles.css
curl http://localhost:9003/js/app.js
```

### Browser Console
Check console for detailed logs:
- Wallet connection events
- Transaction hashes
- API responses
- Error messages

## 📝 Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Multi-language support (i18n)
- [ ] Dark mode toggle
- [ ] Advanced filtering in history
- [ ] Export certificate as PDF
- [ ] Bulk validation support
- [ ] Mobile app (React Native)

## 📄 License

Part of the AgentKit project. See main repository for license details.

## 🆘 Support

For issues or questions:
1. Check browser console for errors
2. Verify all services are running
3. Check MetaMask network and balance
4. Review server logs in terminal

---

**Built with**: HTML5, CSS3 (Glassmorphism), Vanilla JavaScript, ethers.js v5.7.2
**Network**: Base Sepolia (Chain ID: 84532)
**Technology**: JOLT-Atlas zkML, Groth16 SNARKs, ERC-8004
