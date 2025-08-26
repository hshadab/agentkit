# AgentKit API Documentation

## Overview

AgentKit exposes several APIs for proof generation, verification, and USDC transfers. The system uses a combination of REST endpoints and WebSocket connections for real-time communication.

## Python AI Service API (Port 8002)

### Base URL
```
http://localhost:8002
```

### Endpoints

#### POST /chat
Process natural language commands and generate workflows.

**Request**:
```json
{
  "message": "Generate KYC proof and verify on Ethereum"
}
```

**Response**:
```json
{
  "workflow_id": "wf_123456",
  "status": "initiated",
  "steps": [
    {
      "action": "generate_proof",
      "type": "kyc_compliance",
      "description": "Generate KYC compliance proof"
    },
    {
      "action": "verify_proof",
      "blockchain": "ethereum",
      "description": "Verify proof on Ethereum"
    }
  ]
}
```

**Status Codes**:
- `200` - Success
- `422` - Invalid request format
- `500` - Server error

## WebSocket API (Port 8001)

### Connection
```javascript
const ws = new WebSocket('ws://localhost:8001/ws');
```

### Client → Server Messages

#### Generate Proof
```json
{
  "circuit": "kyc_compliance",
  "inputs": {
    "name": "Alice",
    "age": 25,
    "verified": true
  }
}
```

**Supported Circuits**:
- `kyc_compliance`
- `device_proximity`
- `ai_prediction`
- `age_verification`
- `identity_verification`

### Server → Client Messages

#### Proof Status Update
```json
{
  "type": "proof_status",
  "status": "generating",
  "proof_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Proof Complete
```json
{
  "type": "proof_complete",
  "proof_id": "550e8400-e29b-41d4-a716-446655440000",
  "circuit": "kyc_compliance",
  "proof": {
    "pi_a": ["0x1234...", "0x5678..."],
    "pi_b": [["0x9abc...", "0xdef0..."], ["0x1111...", "0x2222..."]],
    "pi_c": ["0x3333...", "0x4444..."],
    "protocol": "groth16",
    "curve": "bn128"
  },
  "public_signals": ["1", "25", "1"],
  "commitment": "0xabcdef1234567890...",
  "timestamp": 1700000000
}
```

#### Error Message
```json
{
  "type": "error",
  "message": "Failed to generate proof: Circuit execution failed",
  "proof_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Workflow Messages
```json
{
  "type": "workflow_started",
  "workflow_id": "wf_123456",
  "total_steps": 3
}

{
  "type": "workflow_step_update",
  "workflow_id": "wf_123456",
  "step_index": 0,
  "status": "completed",
  "result": {
    "proof_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}

{
  "type": "workflow_completed",
  "workflow_id": "wf_123456",
  "success": true
}
```

## Frontend JavaScript APIs

### ProofManager
```javascript
// Generate a proof
await proofManager.generateProof('kyc_compliance', {
  name: 'Alice',
  age: 25
});

// Get proof by ID
const proof = proofManager.getProof(proofId);

// Get all proofs
const allProofs = Array.from(proofManager.proofs.values());
```

### BlockchainVerifier
```javascript
// Connect to Ethereum
await blockchainVerifier.connectEthereum();

// Verify proof on chain
await blockchainVerifier.verifyOnChain(proofId, 'ethereum');

// Get verification status
const status = await blockchainVerifier.getVerificationStatus(proofId);
```

### TransferManager
```javascript
// Initiate USDC transfer
await transferManager.initiateTransfer({
  recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f7e2c1',
  amount: '1.5',
  blockchain: 'ethereum',
  proofId: '550e8400-e29b-41d4-a716-446655440000'
});

// Check transfer status
const status = await transferManager.getTransferStatus(transferId);
```

## Smart Contract Interfaces

### Ethereum/Base/Avalanche Verifier
```solidity
interface IProofVerifier {
    function verifyProof(
        string memory proofId,
        bytes32 commitment,
        uint8 proofType
    ) external;
    
    function verifiedProofs(bytes32) external view returns (bool);
    
    event ProofVerified(
        string indexed proofId,
        bytes32 indexed commitment,
        address indexed verifier,
        uint256 timestamp
    );
}
```

### IoTeX Device Verifier
```solidity
interface IDeviceVerifier {
    function verifyDeviceProximity(
        uint256[3] memory i_z0_zi,
        uint256[4] memory U_i_cmW_U_i_cmE,
        uint256[2] memory u_i_cmW,
        uint256[3] memory cmT_r,
        uint256[2] memory pA,
        uint256[2][2] memory pB,
        uint256[2] memory pC,
        uint256[4] memory challenge_W_challenge_E_kzg_evals,
        uint256[2][2] memory kzg_proof,
        bytes32 deviceId,
        uint256 proofId
    ) external returns (bool);
    
    function registerDevice(bytes32 deviceId) external;
    
    function getDeviceInfo(bytes32 deviceId) external view returns (
        bool registered,
        address owner,
        uint256 registrationTime,
        uint256 lastProofTime,
        uint256 pendingRewards
    );
}
```

### Solana Program Interface
```rust
pub fn verify_proof(
    ctx: Context<VerifyProof>,
    proof_id: [u8; 32],
    commitment: [u8; 32],
    proof_type: u8,
    timestamp: i64,
) -> Result<()>
```

## Circle API Integration

### Transfer Creation
```javascript
// Internal API used by TransferManager
POST /circle/transfer
{
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f7e2c1",
  "amount": "1.50",
  "blockchain": "ETH-SEPOLIA",
  "walletId": "da83113b-f48f-58a3-9115-31572ebfc127"
}
```

### Transfer Status
```javascript
GET /circle/transfer/{transferId}

Response:
{
  "id": "transfer_123",
  "status": "complete",
  "txHash": "0xabc123...",
  "confirmations": 12
}
```

## Error Codes

### WebSocket Errors
- `1000` - Normal closure
- `1001` - Going away
- `1002` - Protocol error
- `1003` - Unsupported data
- `1006` - Abnormal closure
- `1009` - Message too big
- `1011` - Server error

### API Error Responses
```json
{
  "error": {
    "code": "PROOF_GENERATION_FAILED",
    "message": "Failed to generate proof: Circuit execution failed",
    "details": {
      "circuit": "kyc_compliance",
      "reason": "Invalid input parameters"
    }
  }
}
```

### Common Error Codes
- `INVALID_CIRCUIT` - Unknown proof type
- `PROOF_GENERATION_FAILED` - zkEngine error
- `VERIFICATION_FAILED` - Blockchain verification failed
- `WALLET_NOT_CONNECTED` - No wallet connection
- `INSUFFICIENT_BALANCE` - Not enough tokens for gas
- `TRANSFER_FAILED` - USDC transfer failed

## Rate Limits

### Development Environment
- No rate limits applied

### Production Recommendations
- Chat API: 10 requests per minute per IP
- WebSocket: 100 messages per minute per connection
- Proof generation: 5 concurrent proofs per user
- Blockchain verification: Network-dependent

## Authentication

Currently, the API does not require authentication in development mode. For production:

### Recommended Auth Methods
1. API Key authentication for REST endpoints
2. JWT tokens for WebSocket connections
3. Wallet signature verification for blockchain operations

### Example Header
```
Authorization: Bearer <api_key_or_jwt_token>
```

## WebSocket Connection Management

### Heartbeat/Ping-Pong
The WebSocket server sends ping frames every 30 seconds. Clients should respond with pong frames to maintain the connection.

### Reconnection Strategy
```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 1000; // Start with 1 second

function reconnect() {
  if (reconnectAttempts < maxReconnectAttempts) {
    setTimeout(() => {
      connect();
      reconnectAttempts++;
    }, reconnectDelay * Math.pow(2, reconnectAttempts));
  }
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { AgentKit } from '@agentkit/sdk';

const agentkit = new AgentKit({
  wsUrl: 'ws://localhost:8001/ws',
  apiUrl: 'http://localhost:8002'
});

// Generate proof
const proof = await agentkit.generateProof('kyc_compliance', {
  name: 'Alice',
  age: 25
});

// Verify on blockchain
const verification = await agentkit.verifyOnChain(proof.id, 'ethereum');

// Transfer USDC
const transfer = await agentkit.transferUSDC({
  to: '0x742d35Cc6634C0532925a3b844Bc9e7595f7e2c1',
  amount: '1.50',
  chain: 'ethereum',
  condition: { proofId: proof.id }
});
```

### Python
```python
from agentkit import AgentKit

client = AgentKit(
    ws_url="ws://localhost:8001/ws",
    api_url="http://localhost:8002"
)

# Generate proof
proof = client.generate_proof("kyc_compliance", {
    "name": "Alice",
    "age": 25
})

# Verify on blockchain
verification = client.verify_on_chain(proof.id, "ethereum")

# Transfer USDC
transfer = client.transfer_usdc(
    to="0x742d35Cc6634C0532925a3b844Bc9e7595f7e2c1",
    amount="1.50",
    chain="ethereum",
    condition={"proof_id": proof.id}
)
```

## Best Practices

1. **Always handle WebSocket disconnections** with automatic reconnection
2. **Validate inputs** before sending to the API
3. **Store proof IDs** for later verification
4. **Monitor gas prices** before blockchain operations
5. **Implement proper error handling** for all API calls
6. **Use environment variables** for sensitive configuration
7. **Cache verification results** to reduce blockchain queries
8. **Batch operations** when possible to improve performance

## Support

For API support and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/agentkit/issues)
- Documentation: [Full docs](https://docs.agentkit.dev)
- Community: [Discord/Slack]