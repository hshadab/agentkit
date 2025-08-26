# Official ioID Integration - Updated Implementation

## Overview

The Verifiable Agent Kit now uses the **official IoTeX ioID system** as documented at https://docs.iotex.io/ioid and implemented in https://github.com/iotexproject/ioID-contracts.

## What is ioID?

ioID is IoTeX's decentralized identity framework purpose-built for the machine economy. It enables:
- **On-chain Identity**: NFT-bound smart contract wallets for devices
- **Off-chain Identity**: DIDs and Verifiable Credentials following W3C standards
- **Machine Economy**: Devices can manage assets, receive rewards, and participate in DeFi

## Architecture

### Contract Structure

The official ioID system consists of multiple contracts:

1. **Project** (`0xA596800891e6a95Bf737404411ef529c1F377b4e`): Manages DePIN projects
2. **ProjectRegistry** (`0x601B655c0a20FA1465C9a18e39387A33eEe7F777`): Registry of all projects
3. **ioIDStore** (`0xa822Fd390e8eD3FEC80Bd26c77DD036935463b5E`): Storage for identity data
4. **ioID** (`0x1FCB980eD0287777ab05ADc93012332e11300e54`): Main identity contract
5. **ioIDRegistry** (`0x04e4655Cf258EC802D17c23ec6112Ef7d97Fa2aF`): Registry of all ioIDs

### Identity Creation Flow

```javascript
// 1. Initialize/Join a Project
const projectId = await initializeProject("My DePIN Project");

// 2. Create Device Identity
const result = await createDeviceIoID("SENSOR_001", "temperature-sensor");
// Returns: { ioId: 12345, did: "did:io:12345", deviceId: "0x..." }

// 3. Link to Proximity Verifier
await proximityVerifier.registerDevice(deviceId, owner);
```

## Implementation Details

### Device Registration

```javascript
// User command: "Register device TEMP_SENSOR_01"

// Step 1: Create ioID
const ioIDResult = await officialIoIDManager.createDeviceIoID('TEMP_SENSOR_01', 'sensor');

// Result:
{
    ioId: "12345",                    // On-chain identity ID
    did: "did:io:12345",              // Decentralized Identifier
    deviceId: "0x1234...abcd",        // 32-byte device identifier
    metadata: {                       // Device metadata
        name: "TEMP_SENSOR_01",
        type: "sensor",
        created: "2024-01-20T...",
        owner: "0xOwnerAddress"
    },
    transactionHash: "0xabc...123"    // Blockchain transaction
}
```

### DID Document Structure

Following W3C DID standards:

```json
{
    "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1"
    ],
    "id": "did:io:12345",
    "controller": "0xOwnerAddress",
    "authentication": [{
        "id": "did:io:12345#keys-1",
        "type": "Ed25519VerificationKey2020",
        "controller": "did:io:12345",
        "publicKeyMultibase": "device-public-key"
    }],
    "service": [{
        "id": "did:io:12345#iotex",
        "type": "IoTeXIdentity",
        "serviceEndpoint": {
            "ioId": "12345",
            "deviceName": "TEMP_SENSOR_01",
            "network": "testnet",
            "contracts": { /* contract addresses */ }
        }
    }]
}
```

## Key Differences from Previous Implementation

| Feature | Old Implementation | Official ioID |
|---------|-------------------|---------------|
| Identity Format | Custom DID (did:io:0xhash) | ioID-based (did:io:ioId) |
| Contract | Single Registry | Multi-contract system |
| Project Support | No | Yes - devices belong to projects |
| Standards | Basic W3C | Full W3C DID compliance |
| Integration | Standalone | Part of IoTeX ecosystem |

## Usage in Verifiable Agent Kit

### 1. Device Registration
```bash
"Register device WEATHER_STATION_01"
```
- Creates official ioID on IoTeX blockchain
- Generates W3C-compliant DID document
- Links to proximity verifier contract

### 2. Proximity Verification
```bash
"Generate proximity proof for WEATHER_STATION_01 at 5050,5050"
```
- Uses the device's ioID for identification
- Proof linked to official identity

### 3. Identity Verification
- Check device ownership via ioID
- Verify device is part of legitimate project
- Ensure identity hasn't been revoked

## Benefits

1. **Ecosystem Integration**: Works with all IoTeX DePIN modules
2. **Standards Compliance**: Full W3C DID specification support
3. **Project Management**: Devices organized under projects
4. **Future-proof**: Compatible with IoTeX's evolving identity infrastructure
5. **Cross-chain Ready**: ioIDs can be used across multiple chains

## Testing

1. **Verify Contract Addresses**: Check transactions go to official contracts
2. **ioID Creation**: Ensure devices get numeric ioIDs (not just hashes)
3. **DID Format**: Verify DIDs follow `did:io:{ioId}` format
4. **Project Association**: Confirm devices belong to a project

## Resources

- [Official ioID Documentation](https://docs.iotex.io/depin-infra-modules-dim/ioid-depin-identities)
- [ioID Contracts Repository](https://github.com/iotexproject/ioID-contracts)
- [IoTeX DePIN Infrastructure](https://docs.iotex.io/depin-infra-modules-dim)
- [W3C DID Specification](https://www.w3.org/TR/did-core/)