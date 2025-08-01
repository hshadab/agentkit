# Verifiable Agent Kit - Technical Architecture Document

## Overview

The Verifiable Agent Kit is a production-ready framework for generating and verifying zero-knowledge proofs with multi-chain support and automated USDC transfers. This document provides a comprehensive technical overview of the system architecture, components, and implementation details.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Components](#core-components)
3. [Proof Generation Pipeline](#proof-generation-pipeline)
4. [Verification Mechanisms](#verification-mechanisms)
5. [Blockchain Integration](#blockchain-integration)
6. [Data Flow & Storage](#data-flow--storage)
7. [Security Architecture](#security-architecture)
8. [Performance Characteristics](#performance-characteristics)
9. [API Reference](#api-reference)
10. [Technical Specifications](#technical-specifications)

## System Architecture

### High-Level Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   Frontend UI       │────▶│  Rust WebSocket      │────▶│ zkEngine Binary     │
│  (Real-time WS)     │◀────│  Server (Port 8001)  │◀────│ (Nova → Groth16)    │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
         │                           │                             │
         ▼                           ▼                             ▼
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│ Blockchain Wallets  │     │ Python AI Service    │     │   Circle API        │
│ • MetaMask (ETH)    │     │ • OpenAI GPT-4o     │     │ • Real USDC         │
│ • Solflare (SOL)    │     │ • Workflow Parser    │     │ • Sandbox Network   │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

### Component Communication

- **Frontend ↔ Rust Server**: WebSocket connection for real-time updates
- **Frontend → Python Service**: HTTP POST for natural language processing
- **Python Service → Rust Server**: HTTP POST for workflow execution
- **Rust Server → zkEngine**: Process spawning with file I/O
- **Frontend → Blockchain**: Direct wallet integration via Web3.js/Solana Web3

## Core Components

### 1. Rust WebSocket Server (`src/main.rs`)

**Purpose**: Central coordination hub for all system operations

**Key Responsibilities**:
- WebSocket connection management
- HTTP endpoint serving
- Proof generation orchestration
- File system management
- Workflow state tracking

**Technical Details**:
```rust
// Key endpoints
GET  /ws                    // WebSocket connection
POST /workflow_update       // Workflow status updates
GET  /api/proofs           // List all proofs
GET  /api/proof/:id/verify // Verify proof locally
POST /api/proof/:id/update-verification // Persist verification data
```

### 2. Python AI Service (`services/chat_service.py`)

**Purpose**: Natural language understanding and command routing

**Key Responsibilities**:
- OpenAI GPT-4o integration
- Command parsing and intent detection
- Workflow generation
- Response formatting

**Technical Implementation**:
```python
# Key functions
async def parse_workflow_with_openai(message: str) -> Dict
async def process_with_ai(request: str, context: str) -> str
async def execute_workflow(request: WorkflowRequest) -> Dict
```

### 3. zkEngine Binary (Real Nova Recursive SNARKs)

**Purpose**: Real zero-knowledge proof generation using Nova IVC (Incremental Verifiable Computation)

**Technical Specifications**:
- Binary location: `/home/hshadab/agentic/zkEngine_dev/wasm_file`
- Proof format: CompressedSNARK (bincode serialized)
- Proof size: ~18-19MB per proof
- Generation time: 15-35 seconds (depending on circuit complexity)
- Memory usage: ~500MB-1GB during generation
- Framework: Arecibo/Nova with KZG polynomial commitments

**Real Proof Generation Process**:
1. WASM circuit execution with zkEngine
2. Nova folding for recursive computation
3. CompressedSNARK generation with ~27-30 field elements
4. Binary proof output with base64 encoding
5. Parser extraction for on-chain verification

**Supported Proof Types**:
1. **KYC Compliance** (`kyc_compliance_real.wasm`)
2. **Device Proximity IoT** (`device_proximity.wasm`)
3. **AI Prediction Commitment** (`ai_prediction_commitment.wasm`)
4. **Medical Integrity** (`medical_integrity.wasm`)
5. **DePIN Location** (`depin_location_real.wasm`)

### 4. Frontend UI (`static/`)

**Architecture**: Modular ES6 JavaScript

**Key Modules**:
- `WebSocketManager`: Handles real-time communication
- `UIManager`: DOM manipulation and state management
- `ProofManager`: Proof lifecycle management
- `WorkflowManager`: Multi-step workflow orchestration
- `BlockchainVerifier`: Multi-chain verification
- `TransferManager`: USDC transfer tracking

## Proof Generation Pipeline

### 1. Command Processing

```
User Input → OpenAI Parser → Workflow JSON → Execution Plan
```

### 2. Proof Generation Flow

```
1. Workflow Executor receives command
2. Creates proof directory structure
3. Generates input parameters
4. Spawns zkEngine process
5. Monitors generation progress
6. Stores proof artifacts
7. Updates UI via WebSocket
```

### 3. File Structure for Generated Proofs

```
proofs/
└── proof_kyc_1234567890/
    ├── proof.bin           # Binary proof data (~19MB)
    ├── public.json         # Public inputs
    ├── metadata.json       # Generation metadata
    ├── snark_input.json    # SNARK generation input
    └── .verified           # Local verification marker
```

## Verification Mechanisms

### Local Verification

1. **Process**: zkEngine binary validates proof against public inputs
2. **Time**: ~2-3 seconds
3. **Result**: Boolean validity check

### On-Chain Verification

#### Ethereum/Base
- **Contract**: Groth16 verifier smart contract
- **Gas Cost**: ~300,000-400,000 gas
- **Process**:
  1. Export proof to Ethereum format
  2. Submit transaction with proof data
  3. Contract executes pairing checks
  4. Result stored on-chain

#### Solana
- **Program**: Custom Groth16 verifier program
- **Cost**: ~0.01 SOL
- **Process**:
  1. Create Program Derived Address (PDA)
  2. Submit verification instruction
  3. Program validates proof
  4. PDA stores verification status

## Blockchain Integration

### Smart Contract Architecture

#### Ethereum Verifier Contract
```solidity
contract ProofVerifier {
    mapping(bytes32 => ProofStatus) public proofs;
    
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[6] memory publicSignals
    ) public returns (bool);
}
```

#### Solana Program Structure
```rust
pub struct ProofAccount {
    pub proof_id: [u8; 32],
    pub commitment: [u8; 32],
    pub verified: bool,
    pub timestamp: i64,
}
```

### Multi-Chain Support

- **Ethereum Sepolia**: Primary verification chain
- **Solana Devnet**: High-speed verification
- **Base Sepolia**: Layer 2 verification
- **Avalanche Fuji**: C-Chain EVM-compatible verification

### Deployed Contracts

| Network | Contract Address | Contract Type | Explorer |
|---------|-----------------|---------------|----------|
| Ethereum Sepolia | `0x1e8150050a7a4715aad42b905c08df76883f396f` | Groth16 Proof-of-Proof | [Etherscan](https://sepolia.etherscan.io/address/0x1e8150050a7a4715aad42b905c08df76883f396f) |
| Solana Devnet | `2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7` | Anchor Program | [Solana Explorer](https://explorer.solana.com/address/2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7?cluster=devnet) |
| Base Sepolia | `0x74D68B2481d298F337e62efc50724CbBA68dCF8f` | Groth16 Proof-of-Proof | [Basescan](https://sepolia.basescan.org/address/0x74D68B2481d298F337e62efc50724CbBA68dCF8f) |
| Avalanche Fuji | `0x30e93E8B0804fD60b0d151F724c307c61Be37EE1` | Groth16 Proof-of-Proof | [Snowtrace](https://testnet.snowtrace.io/address/0x30e93E8B0804fD60b0d151F724c307c61Be37EE1) |

## Data Flow & Storage

### Proof Storage

1. **Local Storage**: File system in `proofs/` directory
2. **Metadata Storage**: `proofs_db.json` for quick access
3. **On-Chain Storage**: Verification results only (not full proofs)

### State Management

```javascript
// Frontend state stores
- LocalVerifications: Map<proofId, verificationResult>
- OnChainVerifications: Map<proofId, blockchainData>
- WorkflowStates: Map<workflowId, workflowData>
```

### WebSocket Message Types

```javascript
// Server → Client
- proof_status: Proof generation updates
- workflow_started: Workflow initiated
- workflow_step_update: Step progress
- verification_complete: Verification result
- transfer_status: USDC transfer updates
- list_response: Proof history data

// Client → Server  
- generate_proof: Start proof generation
- verify_proof: Verify existing proof
- blockchain_verification_response: Chain verification result
```

## Security Architecture

### Cryptographic Security

1. **Zero-Knowledge Proofs**: Nova-Groth16 construction
2. **Commitment Scheme**: SHA-256 hashing for AI predictions
3. **Blockchain Security**: Inherited from underlying chains

### API Security

1. **Authentication**: API key based (Circle, OpenAI)
2. **Transport**: HTTPS for external APIs
3. **WebSocket**: Unencrypted (localhost only)

### Private Data Handling

- Private inputs never leave the local system
- Only proof and public inputs are shared
- No sensitive data in logs or error messages

## Performance Characteristics

### Proof Generation

| Proof Type | Generation Time | Proof Size | Memory Usage |
|------------|----------------|------------|--------------|
| KYC | 10-15s | 19MB | 500MB |
| Location | 12-18s | 19MB | 500MB |
| AI Prediction | 15-20s | 19MB | 600MB |

### Verification Performance

| Operation | Time | Cost |
|-----------|------|------|
| Local Verification | 2-3s | Free |
| Ethereum Verification | 30-60s | ~0.01 ETH |
| Solana Verification | 5-10s | ~0.01 SOL |
| Base Verification | 10-20s | ~0.001 ETH |

### System Requirements

- **CPU**: 4+ cores recommended
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 10GB free space
- **Network**: Stable internet for blockchain operations

## API Reference

### REST Endpoints

#### Generate Proof
```
POST /execute_workflow
Body: {
  "command": "Generate KYC proof for Alice"
}
Response: {
  "success": true,
  "workflow_id": "wf_123",
  "workflow_data": {...}
}
```

#### List Proofs
```
GET /api/proofs
Response: {
  "proofs": [
    {
      "proof_id": "proof_kyc_123",
      "function": "prove_kyc",
      "timestamp": 1234567890,
      "verified": true,
      "on_chain_verifications": {...}
    }
  ]
}
```

#### Verify Proof
```
GET /api/v1/proof/:proof_id/verify
Response: {
  "valid": true,
  "proof_id": "proof_kyc_123",
  "details": "Proof verified successfully"
}
```

### WebSocket Protocol

#### Connection
```javascript
ws://localhost:8001/ws
```

#### Message Format
```javascript
// Client → Server
{
  "type": "generate_proof",
  "metadata": {
    "function": "prove_kyc",
    "arguments": ["alice", "1"]
  }
}

// Server → Client
{
  "type": "proof_status",
  "status": "generating",
  "proof_id": "proof_kyc_123",
  "message": "Generating proof..."
}
```

## Technical Specifications

### zkEngine Parameters

- **Curve**: BN254
- **Proof System**: Nova → Groth16
- **Security Level**: 128-bit
- **Max Circuit Size**: 2^20 constraints

### WASM Specifications

Each proof type has a corresponding WASM module:
- `prove_kyc.wasm`: 54 bytes
- `prove_location.wasm`: 365 bytes  
- `ai_content_verification.wasm`: 77 bytes

### Dependencies

**Rust**:
- `axum`: Web framework
- `tokio`: Async runtime
- `serde`: Serialization
- `sqlx`: Database (optional)

**Python**:
- `fastapi`: Web framework
- `openai`: GPT-4o integration
- `python-dotenv`: Environment management

**JavaScript**:
- `web3.js`: Ethereum integration
- `@solana/web3.js`: Solana integration
- `@circle-fin/circle-sdk`: USDC transfers

## Deployment Considerations

### Environment Variables

```env
# Required
OPENAI_API_KEY=sk-...
ZKENGINE_BINARY=./zkengine_binary/zkEngine

# Optional
CIRCLE_API_KEY=...
CIRCLE_ETH_WALLET_ID=...
CIRCLE_SOL_WALLET_ID=...

# Ports
PORT=8001
CHAT_SERVICE_PORT=8002
```

### Production Recommendations

1. **Scaling**: Use process managers (PM2, systemd)
2. **Monitoring**: Implement logging and metrics
3. **Security**: Run behind reverse proxy (nginx)
4. **Persistence**: Use proper database for proof metadata
5. **Backup**: Regular backup of proof artifacts

## Conclusion

The Verifiable Agent Kit provides a complete solution for privacy-preserving verification with real-world blockchain integration. The modular architecture allows for easy extension while maintaining security and performance.

For implementation details and usage examples, refer to the README.md and example commands in the documentation.