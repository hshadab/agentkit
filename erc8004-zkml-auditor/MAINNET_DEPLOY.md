# 🚀 Base Mainnet Deployment Guide

**Production deployment for real USDC revenue**

⚠️ **REAL MONEY** - Follow this guide carefully!

---

## Prerequisites

### 1. Wallet Requirements
- **Deployment wallet** with ~0.02 ETH on Base Mainnet (~$50)
  - Contract deployment: ~0.01 ETH
  - Initial testing: ~0.01 ETH
- **Treasury wallet** (recommended: multi-sig like Gnosis Safe)

### 2. Get Real ETH on Base Mainnet
```bash
# Option 1: Bridge from Ethereum
# https://bridge.base.org/

# Option 2: Buy directly on Base
# Coinbase → Send to Base → Your wallet

# Option 3: Use multichain bridge
# https://app.optimism.io/bridge
```

### 3. Real USDC Contract
- **Base Mainnet USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- This is the official Circle USDC on Base

---

## Step 1: Test on Sepolia First

**MANDATORY**: Never deploy to mainnet without testing!

```bash
# 1. Deploy to testnet
npm run deploy:testnet

# 2. Run 5-10 successful validations
npm run backend
npm run ui

# 3. Verify all workflows pass
# - Agent submission
# - USDC approval
# - Payment processing
# - Proof generation
# - On-chain validation

# 4. Check for bugs, fix if needed
```

**Only proceed to mainnet after 100% success rate on testnet!**

---

## Step 2: Deploy Groth16 Verifier to Base Mainnet

The existing verifier (0xf752...) is on **Sepolia only**. You need a new one on mainnet.

### Option A: Reuse Existing Circuit (Recommended)
```bash
# If you have the circuit from acp/ directory
cd /home/hshadab/agentkit/acp/contracts

# Deploy to Base mainnet
npx hardhat run deploy-jolt-verifier.js --network base
```

### Option B: Create New Verifier
```bash
# 1. Get the Groth16 verifier Solidity file
# Location: acp/contracts/JoltDecisionVerifier.sol

# 2. Deploy via Hardhat
npx hardhat run scripts/deploy-verifier.js --network base

# 3. Save the deployed address
# e.g., 0xNEW_VERIFIER_ADDRESS_ON_MAINNET
```

**Save this address!** You'll need it for the next step.

---

## Step 3: Configure Production Environment

```bash
# Copy production template
cp .env.production .env

# Edit with production values
nano .env
```

Required values:
```bash
# Network
BASE_RPC_URL=https://mainnet.base.org  # Or Alchemy/Infura

# ⚠️ CRITICAL: Use a new wallet for production, NOT your testnet key!
PRIVATE_KEY=your_NEW_production_private_key_here

# Real USDC on Base Mainnet
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Your deployed verifier from Step 2
GROTH16_VERIFIER=0xYourNewMainnetVerifierAddress

# Treasury (use multi-sig in production!)
TREASURY_ADDRESS=your_gnosis_safe_address_here

# Services (use HTTPS in production)
PROOF_SERVICE_URL=https://yourdomain.com:9001
BACKEND_PORT=9002

# Block Explorer
BASESCAN_API_KEY=your_basescan_api_key_here
```

---

## Step 4: Deploy Registry Contract to Base Mainnet

```bash
# Compile contracts
npm run compile

# Deploy to mainnet (uses .env file)
npm run deploy:mainnet
```

**Expected output:**
```
🚀 Deploying zkML Agent Auditor to Base Mainnet...

📋 Deployment Configuration:
   USDC Token: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
   Groth16 Verifier: 0xYourVerifierAddress
   Treasury: 0xYourTreasuryAddress

📝 Deploying ZkMLValidationRegistry...
✅ ZkMLValidationRegistry deployed to: 0xYourNewRegistryAddress

💾 Deployment info saved to deployments-mainnet.json

Explorer:
  https://basescan.org/address/0xYourNewRegistryAddress
```

**SAVE ALL THESE ADDRESSES** in a secure location!

---

## Step 5: Verify Contracts on BaseScan

```bash
# Verify Groth16 Verifier
npx hardhat verify --network base 0xYourVerifierAddress

# Verify Registry
npx hardhat verify --network base \
  0xYourRegistryAddress \
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" \
  "0xYourVerifierAddress" \
  "0xYourTreasuryAddress"
```

**Why verify?**
- Users can see contract source code
- Builds trust
- Required for serious projects

---

## Step 6: Production Backend Deployment

### Option A: Railway (Recommended)
```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Create new project
railway init

# 4. Set environment variables
railway variables set BASE_RPC_URL=https://mainnet.base.org
railway variables set PRIVATE_KEY=your_production_key
railway variables set USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
railway variables set GROTH16_VERIFIER=0xYourVerifier
railway variables set TREASURY_ADDRESS=0xYourTreasury
railway variables set REGISTRY_ADDRESS=0xYourRegistry

# 5. Deploy
railway up
```

### Option B: Render
1. Go to https://render.com
2. New → Web Service
3. Connect your GitHub repo
4. Build command: `npm install`
5. Start command: `npm run backend:prod`
6. Add environment variables in dashboard

### Option C: VPS (DigitalOcean, AWS, etc.)
```bash
# SSH into server
ssh user@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone your-repo
cd erc8004-zkml-auditor

# Install dependencies
npm install

# Install PM2
npm install -g pm2

# Start with PM2
pm2 start backend/zkml-auditor-backend.js --name zkml-auditor

# Save PM2 config
pm2 save
pm2 startup
```

---

## Step 7: Production Frontend Deployment

### Option A: Vercel (Recommended for Static Sites)
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy UI
cd ui/
vercel

# 3. Set production environment variables in Vercel dashboard
# - BACKEND_URL=https://your-backend-domain.com
# - USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

### Option B: Netlify
1. Drag & drop `ui/` folder to https://app.netlify.com/drop
2. Configure environment variables
3. Custom domain (optional)

---

## Step 8: Security Checklist

### Before Going Live:

- [ ] **Private keys secured** (use environment variables, never commit)
- [ ] **Treasury is multi-sig** (Gnosis Safe recommended)
- [ ] **Rate limiting enabled** on backend
- [ ] **HTTPS enabled** (SSL certificates)
- [ ] **Contract verified** on BaseScan
- [ ] **Error monitoring** (Sentry/Rollbar)
- [ ] **Backup wallet** for emergency admin actions
- [ ] **Testing completed** (10+ successful testnet validations)
- [ ] **Gas price alerts** set up
- [ ] **Monitoring dashboard** (Uptime, errors, revenue)

### Production Security Upgrades:

```javascript
// backend/zkml-auditor-backend.js - Add these:

// 1. Rate limiting
const rateLimit = require('express-rate-limit');
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// 2. CORS (restrict to your domain)
app.use(cors({
  origin: 'https://yourdomain.com'
}));

// 3. Environment-based config
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  // Use secure RPC endpoints (Alchemy/Infura)
  // Enable logging to file
  // Disable debug endpoints
}
```

---

## Step 9: Launch Checklist

### Pre-Launch (1 week before)
- [ ] All contracts deployed & verified
- [ ] Backend running on production server
- [ ] Frontend deployed to CDN
- [ ] 5 test validations on mainnet (use your own agents)
- [ ] Documentation updated with mainnet addresses
- [ ] Social media accounts ready
- [ ] Landing page live

### Launch Day
- [ ] Monitor backend logs in real-time
- [ ] Watch contract events on BaseScan
- [ ] Twitter announcement with demo video
- [ ] Post on r/ethereum, r/CryptoCurrency
- [ ] Submit to ERC-8004 GitHub discussions
- [ ] Email Coinbase/Base for potential feature
- [ ] Track first customer validation

### Post-Launch (1 week after)
- [ ] Analyze usage metrics
- [ ] Fix any bugs reported
- [ ] Optimize gas costs if high
- [ ] Customer support system
- [ ] Pricing adjustments based on demand

---

## Costs & Revenue

### Initial Costs (One-time)
- Verifier deployment: ~0.01 ETH (~$25)
- Registry deployment: ~0.01 ETH (~$25)
- Testing (5 validations): ~0.002 ETH (~$5)
- **Total: ~$55**

### Monthly Costs (Recurring)
- Backend hosting: $5-20 (Railway/Render)
- Frontend hosting: $0 (Vercel/Netlify free tier)
- RPC calls: $0 (Alchemy free tier: 300M compute units/month)
- Domain: $12/year (~$1/month)
- **Total: ~$6-21/month**

### Revenue Model
- **Validation fee**: $2 USDC per agent
- **Gas cost**: ~$0.75 per validation
- **Net profit**: ~$1.25 per validation

### Break-even
- Need: 44 validations to cover initial costs ($55 / $1.25)
- Need: 5-17 validations/month to cover monthly costs
- **Target**: 100 validations/month = $125/month profit

### Revenue Projections
| Month | Validations | Revenue | Costs | Profit |
|-------|-------------|---------|-------|--------|
| 1     | 50          | $100    | $21   | $79    |
| 3     | 150         | $300    | $63   | $237   |
| 6     | 500         | $1,000  | $126  | $874   |
| 12    | 2,000       | $4,000  | $252  | $3,748 |

---

## Monitoring & Analytics

### Set Up Monitoring

1. **Uptime Monitoring** (Free)
   - UptimeRobot: https://uptimerobot.com
   - Monitor backend `/health` endpoint

2. **Error Tracking**
   ```bash
   npm install @sentry/node
   ```
   ```javascript
   // backend/zkml-auditor-backend.js
   const Sentry = require('@sentry/node');
   Sentry.init({ dsn: process.env.SENTRY_DSN });
   ```

3. **Revenue Dashboard**
   - Track ValidationResponse events on BaseScan
   - Build simple analytics dashboard
   - Daily/weekly revenue reports

---

## Support & Maintenance

### Daily Tasks
- Check backend health endpoint
- Monitor error logs
- Check treasury balance

### Weekly Tasks
- Review usage metrics
- Customer support (if any issues)
- Social media engagement

### Monthly Tasks
- Review and optimize gas costs
- Analyze revenue vs. projections
- Plan feature improvements
- Security audit

---

## Emergency Procedures

### If Backend Goes Down
1. Check logs: `pm2 logs zkml-auditor`
2. Restart: `pm2 restart zkml-auditor`
3. If persists, redeploy from backup

### If Contract Has Bug
1. **DO NOT** try to upgrade (contracts are immutable)
2. Deploy new fixed contract
3. Pause old contract (if pausable)
4. Migrate users to new contract
5. Update frontend/backend to use new address

### If Treasury Compromised
1. Immediately pause contract (if pausable)
2. Deploy new registry with new treasury
3. Announce to users
4. Learn from incident, improve security

---

## Next Steps After Mainnet Launch

1. **Week 1**: Monitor closely, fix bugs
2. **Week 2-4**: Marketing push (Twitter, Reddit, Discord)
3. **Month 2**: Add features (batch validations, API keys)
4. **Month 3**: Present at Devconnect (Nov 2025)
5. **Month 6**: Expand to other chains (Optimism, Arbitrum)
6. **Year 1**: Build agent marketplace on top

---

## Final Checklist Before Pressing Deploy

- [ ] I have tested on Base Sepolia successfully
- [ ] I have backed up all private keys securely
- [ ] I have verified all contract addresses are correct
- [ ] I have set up monitoring and alerts
- [ ] I have real ETH on Base Mainnet for gas
- [ ] I understand this uses REAL MONEY
- [ ] I am ready to support users
- [ ] I have read this entire guide

**Once you check all boxes above, you're ready to deploy!**

```bash
npm run deploy:mainnet
```

---

**Good luck with your launch! 🚀**

Questions? Check BaseScan, Etherscan, or Base Discord for support.
