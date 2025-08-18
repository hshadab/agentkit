# AI Agents + ZKP + USDC Integration

AI agents that can autonomously spend USDC with NovaNet ZKP verification and CCTP V2 settlement.

## Overview

This integration combines:
- **Circle's AI Agent Framework**: Multi-agent collaboration with USDC payments
- **NovaNet ZKP Verification**: Zero-knowledge proofs for agent authorization
- **CCTP V2 Settlement**: Instant cross-chain USDC transfers
- **Smart Contract Escrow**: Automated fund release based on AI + ZKP verification

## Architecture

```
AI Agent Request → ZKP Authorization → AI Validation → CCTP V2 Payment
      ↓                 ↓                 ↓              ↓
   [Intent]        [NovaNet Proof]   [Circle AI]    [Fast Transfer]
```

## Folder Structure

```
ai-agents/
├── README.md                    # This file
├── core/                        # Core AI agent framework
│   ├── aiAgent.js              # Base AI agent class
│   ├── agentCollaboration.js   # Multi-agent coordination
│   └── agentRegistry.js        # Agent management
├── wallets/                     # Circle Programmable Wallets
│   ├── walletManager.js        # Wallet creation and management
│   └── walletConfig.js         # Wallet configuration
├── zkp/                         # NovaNet ZKP integration
│   ├── zkpVerifier.js          # ZKP proof generation/verification
│   └── proofSchemas.js         # Proof type definitions
├── escrow/                      # Smart contract escrow
│   ├── EscrowContract.sol      # Solidity escrow contract
│   ├── escrowManager.js        # Contract interaction
│   └── paymentTriggers.js      # Automated release logic
├── examples/                    # Demo scenarios
│   ├── research-collaboration.js  # Multi-agent research
│   ├── service-marketplace.js     # AI service trading
│   └── freelance-escrow.js        # Freelance payment demo
└── tests/                       # Test files
    ├── agent.test.js           # AI agent tests
    ├── zkp.test.js             # ZKP verification tests
    └── integration.test.js     # End-to-end tests
```

## Quick Start

1. **Set up environment**:
   ```bash
   # Add to .env
   CIRCLE_API_KEY=your_circle_api_key
   OPENAI_API_KEY=your_openai_api_key
   NOVANET_ENDPOINT=ws://localhost:8001/ws
   ```

2. **Test basic AI agent**:
   ```bash
   node circle/ai-agents/examples/research-collaboration.js
   ```

3. **Run ZKP + payment demo**:
   ```bash
   node circle/ai-agents/examples/service-marketplace.js
   ```

## Integration Points

### With Existing Systems
- **Does NOT modify** existing Circle Gateway or zkpCircleIntegration
- **Shares** wallet configurations and ZKP engine connection
- **Extends** current capabilities with AI agent automation

### New Capabilities
- AI agents that can prove their identity and spending authority
- Automated USDC payments based on work completion
- Cross-chain agent operations via CCTP V2
- Trust-minimized escrow with dual AI + ZKP verification

## Use Cases

### 1. AI Research Collaboration
```bash
# Multiple AI agents collaborate on research, get paid per contribution
node examples/research-collaboration.js
```

### 2. AI Service Marketplace
```bash
# AI agents buy/sell services with automatic escrow release
node examples/service-marketplace.js
```

### 3. Freelance Work Automation
```bash
# AI validates work completion, triggers automatic payment
node examples/freelance-escrow.js
```

## Technical Stack

- **AI Framework**: OpenAI GPT + custom agent logic
- **Blockchain**: Ethereum/Base/Avalanche testnets
- **Payments**: Circle Programmable Wallets + CCTP V2
- **Verification**: NovaNet ZKP proofs
- **Contracts**: Solidity escrow with automated triggers

## Demo Features

- ✅ Real testnet transactions
- ✅ Actual AI agent decision making
- ✅ Live ZKP proof generation
- ✅ Instant CCTP V2 settlement
- ✅ Multi-chain operations
- ✅ Automated escrow release

This system demonstrates the future of autonomous AI commerce with cryptographic guarantees and instant settlement.