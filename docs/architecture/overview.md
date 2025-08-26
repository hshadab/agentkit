# AgentKit Architecture

## System Overview

AgentKit is a modular, production-ready framework for generating and verifying zero-knowledge proofs across multiple blockchains with automated USDC transfers.

## Core Components

### 1. Rust WebSocket Server (Port 8001)
**Location**: `src/main.rs`

The Rust server acts as the central hub for proof generation and WebSocket communication:
- Handles WebSocket connections from the frontend
- Manages zkEngine binary execution
- Processes proof generation requests
- Broadcasts real-time status updates
- Serves static files when accessed via HTTP

**Key Features**:
- Async WebSocket handling with Axum
- UUID-based proof tracking
- SHA256 commitment generation
- CORS support for cross-origin requests

### 2. Python AI Service (Port 8002)
**Location**: `services/chat_service.py`

The AI service processes natural language commands using OpenAI GPT-4o:
- Parses user commands into structured workflows
- Determines proof types and parameters
- Manages workflow execution
- Handles USDC transfer logic
- Provides REST API endpoints

**Endpoints**:
- `POST /chat` - Process natural language commands
- WebSocket integration for real-time updates

### 3. Frontend UI (Port 8000)
**Location**: `static/`

Modern, modular JavaScript frontend:
- Real-time WebSocket connection
- Dynamic proof card generation
- Blockchain wallet integration
- Proof history management
- Transfer status tracking

**Structure**:
```
static/
├── js/
│   ├── blockchain/     # Blockchain-specific verifiers
│   ├── core/          # Configuration and utilities
│   ├── device/        # IoT device management
│   ├── ui/            # UI components and handlers
│   └── workflow/      # Workflow execution
└── parsers/nova/      # Nova proof parsing
```

### 4. zkEngine Binary (Real Nova Proofs)
**Location**: `zkengine_binary/`

The cryptographic engine that generates real zero-knowledge proofs using Nova recursive SNARKs:
- Executes WASM circuits compiled from Rust
- Generates Nova IVC (Incremental Verifiable Computation) proofs
- Produces ~18MB CompressedSNARK proofs with folding commitments
- Uses Arecibo framework for Nova implementation
- Outputs bincode-serialized proofs for parsing

**Real Proof Generation**:
- Nova recursion for incremental computation
- KZG polynomial commitments for efficiency
- Groth16 final SNARK for succinct verification
- No simulation mode - all proofs are cryptographically valid

**Proof Types**:
1. KYC Compliance (`kyc_compliance_real.wasm`)
2. Device Proximity IoT (`device_proximity.wasm`) 
3. AI Prediction (`ai_prediction_commitment.wasm`)
4. Medical Integrity (`medical_integrity.wasm`)
5. DePIN Location (`depin_location_real.wasm`)

## Data Flow

### Proof Generation Flow
```
User Input → AI Service → Workflow Parser → WebSocket → Rust Server → zkEngine → Proof
    ↓                                                                              ↓
    UI ← WebSocket Updates ← Status Broadcasting ← Proof Complete ← Commitment
```

### Blockchain Verification Flow
```
Proof → Frontend Parser → Wallet Connection → Smart Contract → Transaction
                              ↓                      ↓              ↓
                         MetaMask/Solflare    Verification    Explorer Link
```

### USDC Transfer Flow
```
Verification Success → Transfer Manager → Circle/Coinbase API → Blockchain
                              ↓                    ↓              ↓
                         Status Polling       Transfer ID    Confirmation
```

## Blockchain Integration

### Supported Networks

| Network | Type | Features |
|---------|------|----------|
| **Ethereum Sepolia** | EVM | Standard verification contract |
| **Solana Devnet** | Non-EVM | High-speed, low-cost verification |
| **Base Sepolia** | EVM L2 | AI prediction commitments |
| **Avalanche Fuji** | EVM | Groth16 proof-of-proof verifier |
| **IoTeX Testnet** | EVM | Nova Decider for IoT devices |

### Smart Contract Architecture

**Ethereum/Base/Avalanche**:
- Solidity-based verification contracts
- Event emission for proof records
- Commitment-based deduplication

**Solana**:
- Anchor framework programs
- PDA-based proof accounts
- Instruction-based verification

**IoTeX**:
- Real Nova Decider integration (0x4EF6152c952dA7A27bb57E8b989348a73aB850d2)
- ProximityNovaDecider for device proximity verification
- Device registration with ioID integration
- IOTX reward distribution for verified devices
- Binary proof parsing via zkEngine calldata parser

## Security Considerations

### Proof Security
- Unique proof IDs with timestamps
- SHA256 commitments for integrity
- On-chain verification records
- Replay attack prevention

### API Security
- Environment variable configuration
- CORS restrictions
- Rate limiting (planned)
- Input validation

### Wallet Security
- Direct user signing required
- No private key storage
- Network validation
- Transaction confirmation

## Storage Architecture

### LocalStorage
- Proof history
- Transfer records
- User preferences
- Cached verification results

### On-Chain Storage
- Proof commitments
- Verification timestamps
- Device registrations
- Transfer records

## WebSocket Protocol

### Message Types
```javascript
// Client → Server
{
  "circuit": "kyc_compliance",
  "inputs": { ... }
}

// Server → Client
{
  "type": "proof_status",
  "status": "generating",
  "proof_id": "uuid"
}

{
  "type": "proof_complete",
  "proof": { ... },
  "commitment": "0x..."
}
```

## Performance Characteristics

### Proof Generation (Real zkEngine Nova)
- KYC: ~18-25 seconds (Nova recursion + Groth16)
- Device Proximity: ~15-20 seconds (~18MB proof)
- AI Prediction: ~20-30 seconds (with commitment)
- Medical Integrity: ~25-35 seconds (complex constraints)
- DePIN Location: ~20-25 seconds (IoTeX specific)

### Blockchain Operations
- Ethereum: 12-15 second blocks
- Solana: <1 second confirmation
- Base: 2-3 second blocks
- Avalanche: ~2 second finality
- IoTeX: ~5 second blocks

### USDC Transfers
- Circle API: 30-60 seconds
- Coinbase API: 45-90 seconds
- Network dependent confirmation

## Scalability Considerations

### Current Limitations
- Single zkEngine instance
- Sequential proof generation
- LocalStorage for history

### Future Improvements
- Proof generation queue
- Parallel zkEngine execution
- Database integration
- Caching layer
- CDN for static assets

## Development Workflow

### Adding New Proof Types
1. Create WASM circuit in `zkengine_binary/`
2. Add circuit type to Rust server
3. Update AI service parsing
4. Add frontend UI support
5. Deploy verification contracts

### Adding New Blockchains
1. Deploy verification contract
2. Add configuration to `config.js`
3. Create blockchain verifier module
4. Update wallet connection logic
5. Test end-to-end flow

## Monitoring & Debugging

### Log Locations
- Rust server: Console output
- AI service: `/tmp/chat_service.log`
- Frontend: Browser console
- zkEngine: Proof generation logs

### Debug Tools
- Frontend debug toggle
- WebSocket message inspector
- Blockchain transaction tracers
- Proof file inspection

## Dependencies

### Core Technologies
- **Rust**: WebSocket server
- **Python**: AI service
- **Node.js**: Build tools and tests
- **zkEngine**: Proof generation
- **OpenAI**: Natural language processing

### Key Libraries
- **Axum**: Rust web framework
- **FastAPI**: Python web framework
- **Ethers.js**: Ethereum interaction
- **@solana/web3.js**: Solana interaction
- **Circle SDK**: USDC transfers

## Deployment Considerations

### Service Requirements
- Rust 1.70+
- Python 3.8+
- Node.js 18+
- 4GB+ RAM recommended
- SSD for proof storage

### Environment Variables
- `OPENAI_API_KEY` (required)
- `CIRCLE_API_KEY`
- `COINBASE_API_KEY`
- Service ports
- Blockchain RPC endpoints

### Production Checklist
- [ ] SSL/TLS certificates
- [ ] Domain configuration
- [ ] Rate limiting
- [ ] Error monitoring
- [ ] Backup strategy
- [ ] Log rotation
- [ ] Resource monitoring