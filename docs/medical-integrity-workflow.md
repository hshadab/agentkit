# Medical Integrity Workflow Documentation

## Overview

The Medical Integrity Workflow is a zero-knowledge proof system that enables secure verification of medical records on the Avalanche blockchain. This workflow creates an immutable audit trail for medical records while preserving patient privacy through zero-knowledge proofs.

## Features

- **Privacy-Preserving**: Uses zero-knowledge proofs to verify medical record integrity without revealing sensitive patient data
- **Blockchain-Based**: Creates immutable commitments on Avalanche blockchain
- **Two-Step Verification**: Separates record commitment from integrity verification
- **Real-Time Processing**: Generates proofs using zkEngine in ~20 seconds

## Workflow Steps

### Step 1: Medical Record Commitment
- Creates a commitment of the medical record on Avalanche blockchain
- Generates a unique record ID and transaction hash
- Records patient ID, record hash, and timestamp on-chain

### Step 2: Integrity Verification
- Generates a zero-knowledge proof of medical record integrity
- Verifies the proof on Avalanche blockchain
- Creates a verifiable link between the commitment and verification

## Usage

### Command
```
Create medical record for patient [PATIENT_ID] and verify integrity
```

Example:
```
Create medical record for patient 12345 and verify integrity
```

### Process Flow

1. **Record Creation**: The system generates a random record hash and creates a commitment on Avalanche
2. **Proof Generation**: zkEngine generates a zero-knowledge proof of the medical record's integrity
3. **On-Chain Verification**: The proof is verified on Avalanche, creating a permanent record

### Transaction Links

Each workflow execution produces two transaction links:

1. **Commitment Transaction**: Records the medical record on Avalanche
   - Example: https://testnet.snowtrace.io/tx/0xad0c5ded06819ee3a584ef4556b09bee0f3b03e58e5cfc07b28ec7db462b2fff

2. **Verification Transaction**: Verifies the integrity proof on-chain
   - Example: https://testnet.snowtrace.io/tx/0xf03b88ee76a01331b551f4955c86da895938a9b7021f5c3499296cccea73f481

## Technical Details

### Smart Contract
- Network: Avalanche Fuji Testnet
- Contract Address: Configured in `config.js`
- Functions:
  - `createMedicalRecord(patientId, recordHash, patientAddress)`
  - `verifyIntegrity(recordId, zkProof, currentHash)`

### Proof Generation
- Proof Type: `medical_integrity`
- WASM Binary: `medical_integrity.wasm`
- Step Size: 10 (optimized for ~16MB proof size)
- Proof Time: ~20 seconds

### Network Configuration
- Chain ID: 43113 (Fuji Testnet)
- RPC URL: https://api.avax-test.network/ext/bc/C/rpc
- Explorer: https://testnet.snowtrace.io/

## Implementation Files

### Frontend
- `/static/js/ui/medical-record-handler.js` - Handles medical record creation and commitment
- `/static/js/ui/avalanche-medical-integrity.js` - Avalanche blockchain integration
- `/static/js/blockchain/avalanche-medical-wrapper.js` - Module wrapper for medical integrity

### Backend
- `/parsers/workflow/workflowExecutor.js` - Executes the medical workflow steps
- `/zkengine_binary/medical_integrity.wasm` - Zero-knowledge proof generation binary

### Configuration
- `/static/js/core/config.js` - Contains Avalanche network and contract configuration

## Error Handling

The system handles several error cases:
- Network switching errors (automatically switches to Avalanche)
- Contract deployment status (falls back to data transactions if contract not deployed)
- MetaMask connection issues
- Proof generation failures

## Security Considerations

- Patient IDs are hashed before storage
- Medical record content is never stored on-chain, only hashes
- Zero-knowledge proofs ensure privacy while maintaining verifiability
- All transactions require user approval through MetaMask

## Future Enhancements

- Support for multiple medical record types
- Batch verification of multiple records
- Integration with healthcare provider systems
- Support for mainnet deployment