# zkML Agent Auditor - MVP Architecture

## Overview
First monetizable zkML validation service implementing ERC-8004 standard for trustless AI agent verification.

## Target Launch: November 2025 Devconnect Buenos Aires

## System Components

### 1. Smart Contracts (Base Sepolia)

#### **ZkMLValidationRegistry.sol**
- Implements ERC-8004 Validation Registry interface
- Integrates Groth16 verifier for zkML proofs
- Accepts USDC payments (subscription or per-validation)
- Stores permanent validation records

```solidity
contract ZkMLValidationRegistry {
    // ERC-8004 Standard Interface
    event ValidationRequest(bytes32 indexed agentId, bytes32 indexed validatorId, bytes32 dataHash);
    event ValidationResponse(bytes32 indexed agentId, bytes32 indexed validatorId, bytes32 dataHash, uint8 response);

    // zkML Extension
    event ProofVerified(bytes32 indexed agentId, bytes32 proofHash, bool valid);
    event PaymentReceived(address indexed payer, uint256 amount, bytes32 indexed agentId);

    // Core Functions
    function requestValidation(bytes32 agentId, bytes memory modelData) external payable;
    function submitProof(bytes32 agentId, bytes32 dataHash, Groth16Proof proof) external;
    function verifyProof(Groth16Proof proof, uint256[] publicSignals) internal returns (bool);
}
```

**Dependencies**:
- Groth16 Verifier (existing at `0xf752509cb5af017f465B42053d41B730991c6624`)
- USDC Token (`0x036CbD53842c5426634e7929541eC2318f3dCF7e` on Base Sepolia)

---

### 2. Backend Service (Port 9002)

#### **zkml-auditor-backend.js**
Handles agent submissions and proof generation using existing JOLT-Atlas infrastructure.

**Workflow**:
1. Agent submits model (ONNX file or model hash)
2. Backend runs test inference to verify model behavior
3. Generates zkML proof using JOLT-Atlas (existing `/acp/services/proof-service.js`)
4. Generates Groth16 proof for on-chain verification
5. Posts validation to ERC-8004 registry
6. Returns validation certificate to agent

**Endpoints**:
- `POST /submit-agent` - Upload model for validation
- `POST /purchase-validation` - Buy validation (Stripe or USDC)
- `GET /validation-status/:agentId` - Check proof generation status
- `GET /certificate/:agentId` - Download validation certificate

**Integration**:
- Reuses existing proof service at `acp/services/proof-service.js`
- Calls `POST /prove-authorization` to generate proofs
- Uses existing JOLT-Atlas binary and Groth16 circuits

---

### 3. Frontend UI (Port 8080)

#### **index.html** - Simple 3-step workflow
1. **Upload Agent Model**
   - File upload (ONNX) or model hash input
   - Display model architecture preview
   - Estimated validation cost

2. **Payment**
   - Stripe integration (testnet)
   - USDC payment option (Base Sepolia)
   - Pricing: $2-$5 per validation

3. **Validation Certificate**
   - Download certificate (PDF/JSON)
   - ERC-8004 registry link
   - On-chain verification TX

**Tech Stack**:
- Vanilla JS (no frameworks for speed)
- Web3.js for contract interaction
- Existing UI components from `Circle-OOAK/node-ui`

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Submission                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  zkML Auditor Backend (Port 9002)                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Receive model → 2. Run test inference                 │   │
│  │ 3. Call proof-service.js → 4. Get JOLT + Groth16 proofs  │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  ERC-8004 Validation Registry (Base Sepolia)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Verify Groth16 proof via existing verifier contract   │   │
│  │ 2. Store validation (agentId → proofHash)                │   │
│  │ 3. Emit ValidationResponse event (0-100 score)           │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Agent receives validation certificate + on-chain proof         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Monetization

### MVP Pricing (Testnet)
- **Pay-per-validation**: $2 per agent
- **Stripe integration**: Test mode for demo

### Production Pricing
- **Bronze**: $10/month (25 validations)
- **Gold**: $50/month (unlimited validations)
- **Enterprise**: Custom pricing for agent fleets

---

## Integration with Existing Infrastructure

### Reusing Components:
1. **Proof Generation**: `acp/services/proof-service.js` (port 9001)
   - Already has JOLT-Atlas integration
   - Already generates Groth16 proofs
   - Just call `/prove-authorization` endpoint

2. **Groth16 Verifier**: Deployed at `0xf752509cb5af017f465B42053d41B730991c6624`
   - Already verified and working
   - Accepts agent authorization proofs

3. **ONNX Model Loading**: `acp/models/authorization_model.onnx`
   - Example model architecture
   - Can validate any ONNX model with similar structure

### New Components:
1. **ERC-8004 Registry Contract** (new deployment)
2. **zkML Auditor Backend** (new service on port 9002)
3. **Simple UI** (new, but reuse Circle-OOAK components)

---

## MVP Scope (1-2 weeks)

### Week 1: Core Infrastructure
- [x] Research ERC-8004 specification
- [ ] Implement `ZkMLValidationRegistry.sol`
- [ ] Deploy to Base Sepolia
- [ ] Build `zkml-auditor-backend.js` with proof-service integration
- [ ] Test end-to-end proof flow

### Week 2: UI & Polish
- [ ] Build simple 3-step UI
- [ ] Integrate Stripe payments (test mode)
- [ ] Generate validation certificates
- [ ] Write deployment docs
- [ ] Create demo video

---

## Success Metrics

### Technical:
- Proof generation time: < 2 seconds
- On-chain gas cost: < $0.50 per validation
- UI load time: < 1 second

### Business:
- 10 agent validations during Devconnect demo
- 3 partnerships with agent marketplaces
- $1000 MRR within 30 days of launch

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| JOLT-Atlas binary unavailable | Fallback to deterministic hash (clearly marked as not cryptographic) |
| High gas costs on Base | Optimize proof verification, batch validations |
| Low adoption | Partner with agent marketplaces for distribution |
| ERC-8004 not finalized | Build as extension, easy to update to final spec |

---

## Future Enhancements (Post-MVP)

1. **Agent Identity Registry** - ERC-8004 Identity component
2. **Reputation Scoring** - Aggregate validation history
3. **Multi-chain deployment** - Ethereum mainnet, Arbitrum, Optimism
4. **Advanced certifications** - Bias testing, safety benchmarks
5. **Agent marketplace integration** - One-click validation

---

## Technical Dependencies

```json
{
  "contracts": {
    "solidity": "^0.8.20",
    "hardhat": "^2.19.0",
    "@openzeppelin/contracts": "^5.0.0"
  },
  "backend": {
    "express": "^4.18.0",
    "ethers": "^6.9.0",
    "onnxruntime-node": "^1.16.0",
    "snarkjs": "^0.7.0",
    "stripe": "^14.0.0"
  },
  "circuits": {
    "existing": "AgentAuthorizationSimple.circom (acp/circuits/)"
  }
}
```

---

## Repository Structure

```
erc8004-zkml-auditor/
├── contracts/
│   ├── ZkMLValidationRegistry.sol
│   ├── interfaces/
│   │   └── IERC8004ValidationRegistry.sol
│   └── deploy/
│       └── deploy-registry.js
├── backend/
│   ├── zkml-auditor-backend.js
│   ├── certificate-generator.js
│   └── payment-processor.js
├── ui/
│   ├── index.html
│   ├── js/
│   │   ├── app.js
│   │   └── web3-integration.js
│   └── css/
│       └── styles.css
└── docs/
    ├── ARCHITECTURE.md (this file)
    ├── API.md
    └── DEPLOYMENT.md
```

---

**Status**: Architecture design complete ✅
**Next**: Implement smart contract
