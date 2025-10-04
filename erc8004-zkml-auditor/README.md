# zkML Agent Auditor

**First monetizable zkML validation service implementing ERC-8004 standard**

Cryptographic proof system that enables trustless AI agent validation through zero-knowledge machine learning proofs. Agents pay to get verified and receive permanent on-chain certificates.

## 🎯 What This Is

- **ERC-8004 compliant** validation registry
- **NovaNet JOLT-Atlas** zkML proof generation
- **Groth16 zk-SNARK** on-chain verification
- **Real USDC payment** integration ($2/validation)
- **Base Mainnet** ready (test on Sepolia first)

## 🚀 Quick Start

### Testing (Base Sepolia - Free testnet)
```bash
# Install dependencies
npm install

# Configure testnet environment
cp .env.example .env
# Edit .env with testnet settings

# Deploy to Base Sepolia
npm run deploy:testnet

# Start services
npm run backend  # Port 9002
npm run ui       # Port 9003
```

### Production (Base Mainnet - Real USDC revenue)
**📖 See [MAINNET_DEPLOY.md](MAINNET_DEPLOY.md) for full production guide**

```bash
# After successful testnet testing:
cp .env.production .env  # Use production config
npm run deploy:mainnet   # Deploy to mainnet
npm run backend:prod     # Start production backend
```

## 📁 Project Structure

```
erc8004-zkml-auditor/
├── contracts/              # Smart contracts
│   ├── ZkMLValidationRegistry.sol
│   ├── interfaces/IERC8004ValidationRegistry.sol
│   └── deploy/deploy-registry.js
├── backend/                # Node.js backend service
│   └── zkml-auditor-backend.js
├── ui/                     # Frontend
│   ├── index.html
│   ├── js/app.js
│   └── css/styles.css
└── docs/
    ├── ARCHITECTURE.md     # System design
    └── API.md              # API documentation
```

## 🔗 Integration Points

### Existing Infrastructure (Reused)
1. **JOLT-Atlas Proof Service** - `../acp/services/proof-service.js` (Port 9001)
2. **Groth16 Verifier** - `0xf752509cb5af017f465B42053d41B730991c6624` (Base Sepolia)
3. **USDC Token** - `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia)

### New Components
1. **ZkMLValidationRegistry** - ERC-8004 implementation (to be deployed)
2. **zkML Auditor Backend** - Validation orchestration service
3. **Agent Submission UI** - 3-step workflow interface

## 💰 Monetization

### MVP (Testnet)
- **$2 USDC** per validation
- Stripe test mode integration

### Production
- **Bronze**: $10/month (25 validations)
- **Gold**: $50/month (unlimited)
- **Enterprise**: Custom pricing

## 🛠️ How It Works

```
Agent Submits Model → zkML Auditor Backend (9002)
                              ↓
                    Calls Proof Service (9001)
                              ↓
                    JOLT-Atlas generates proof
                              ↓
           Submits to ZkMLValidationRegistry (Base)
                              ↓
            Verifies via Groth16Verifier (0xf752...)
                              ↓
          Stores validation record permanently
```

## 📊 Contract Interface

```solidity
// Request validation (pay $2 USDC)
function requestValidation(
    bytes32 agentValidatorId,
    bytes32 agentServerId,
    bytes32 dataHash
) external payable;

// Submit validation response (backend only)
function submitValidationResponse(
    bytes32 dataHash,
    uint8 response  // 0-100 score
) external;

// Submit zkML proof (backend only)
function submitProof(
    bytes32 agentServerId,
    bytes32 dataHash,
    Groth16Proof calldata proof,
    uint256[] calldata publicSignals
) external;

// Query validation status
function getValidationStatus(
    bytes32 agentServerId,
    bytes32 dataHash
) external view returns (bool validated, uint8 response);
```

## 🧪 Testing

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to testnet
npx hardhat run contracts/deploy/deploy-registry.js --network baseSepolia
```

## 🎯 Roadmap

### Week 1 (Current)
- [x] Smart contract implementation
- [x] Architecture design
- [ ] Deployment script
- [ ] Backend service
- [ ] Simple UI

### Week 2
- [ ] Stripe integration
- [ ] End-to-end testing
- [ ] Demo video
- [ ] Documentation

### Launch (Nov 2025)
- [ ] Present at Devconnect Buenos Aires
- [ ] Partner with 3 agent marketplaces
- [ ] $1k MRR target

## 🔒 Security

- **Audited Verifier**: Uses existing Groth16 verifier (deployed & tested)
- **Payment Safety**: USDC escrow with refund mechanism
- **Access Control**: Only authorized NovaNet backend can submit proofs
- **Rate Limiting**: Request expiration (24 hours)

## 📄 License

MIT

## 🤝 Contributing

This is an MVP for demonstration at Devconnect 2025. Production deployment requires:
1. Smart contract audit
2. Backend security review
3. UI/UX improvements
4. Comprehensive testing

## 📞 Contact

- **Project**: NovaNet zkML Agent Auditor
- **Standard**: ERC-8004 Trustless Agents
- **Launch**: November 2025, Devconnect Buenos Aires

---

**Status**: MVP Development (Week 1 of 2)
