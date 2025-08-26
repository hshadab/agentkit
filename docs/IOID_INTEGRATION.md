# ioID SDK Integration for Device Registration

## Overview

The Verifiable Agent Kit now uses the real IoTeX ioID SDK for device registration, creating proper DIDs (Decentralized Identifiers) for IoT devices instead of simple hashes.

## What is ioID?

ioID is IoTeX's decentralized identity framework for IoT devices. It provides:
- **DIDs**: Unique, decentralized identifiers for devices (format: `did:io:0x...`)
- **On-chain Registry**: Devices are registered on the IoTeX blockchain
- **Identity Documents**: JSON-LD documents describing device metadata
- **Ownership**: Clear ownership and control of device identities

## Implementation Details

### 1. Device Registration Flow

```javascript
// User command: "Register device SENSOR1"

// Step 1: Generate DID
const did = "did:io:0x" + hash(deviceInfo)

// Step 2: Create DID Document
const didDocument = {
    "@context": "https://www.w3.org/ns/did/v1",
    "id": did,
    "controller": ownerAddress,
    "device": {
        "name": "SENSOR1",
        "type": "sensor",
        "created": "2024-01-20T..."
    }
}

// Step 3: Register on ioID Registry
ioIDRegistry.createDID(did, documentURI, hash)

// Step 4: Link to Proximity Verifier
proximityVerifier.registerDevice(didHash, owner)
```

### 2. Key Components

#### ioID Device Manager (`ioid-device-manager.js`)
- Connects to IoTeX network
- Generates DIDs following W3C standards
- Registers DIDs on-chain using ioID Registry
- Manages DID documents

#### Enhanced Device Verifier (`iotex-device-verifier.js`)
- Integrates with ioID for registration
- Uses DIDs for proximity verification
- Maintains backward compatibility

### 3. Smart Contract Integration

**ioID Registry**: `0x0A7e595F8A24Ec278C9C94C3C6e5216c17D881Ce` (IoTeX Testnet)
- `createDID(did, uri, hash)`: Register new DID
- `getDID(did)`: Retrieve DID information
- `updateDID(did, uri, hash)`: Update DID document

**Proximity Verifier**: `0x5967d15c7a6fD3ef7F1f309e766f35252a9de10d`
- Modified to accept DID hashes
- Links DIDs to proximity proofs
- Manages device rewards

## Usage Examples

### Register a Device
```javascript
// Command: "Register device TEMP_SENSOR_01"
const result = await ioIDDeviceManager.registerDeviceDID('TEMP_SENSOR_01', 'sensor');

// Result:
{
    did: "did:io:0x1234...abcd",
    transactionHash: "0xabcd...1234",
    didDocument: { /* W3C DID Document */ },
    explorerUrl: "https://testnet.iotexscan.io/tx/0xabcd...1234"
}
```

### Verify Device Proximity
```javascript
// The system automatically uses the DID if available
await verifyDeviceProximity('TEMP_SENSOR_01', 5080, 5020);
// Uses did:io:0x1234...abcd internally
```

## Benefits of Real ioID Integration

1. **Standards Compliance**: W3C DID specification
2. **Interoperability**: DIDs work across IoTeX ecosystem
3. **Persistence**: Device identities stored on blockchain
4. **Ownership**: Clear device ownership and control
5. **Future-proof**: Compatible with IoTeX's ioID ecosystem

## Testing the Integration

1. **Register a new device**:
   ```
   "Register device WEATHER_STATION_01"
   ```

2. **Check registration on IoTeXScan**:
   - View ioID Registry transactions
   - See DID creation events

3. **Generate proximity proof**:
   ```
   "Generate proximity proof for WEATHER_STATION_01 at 5050,5050"
   ```

4. **Verify the DID is used**:
   - Check console logs for "Using DID did:io:..."
   - Verify transaction uses DID hash

## Future Enhancements

1. **IPFS Integration**: Store DID documents on IPFS
2. **Device Credentials**: Add verifiable credentials to DIDs
3. **Cross-chain DIDs**: Enable DID usage on other chains
4. **Device Authentication**: Use DIDs for device-to-device auth
5. **ioID Mobile SDK**: Integrate with IoTeX mobile wallet

## Resources

- [ioID SDK Documentation](https://github.com/iotexproject/ioID-SDK)
- [W3C DID Specification](https://www.w3.org/TR/did-core/)
- [IoTeX Developer Portal](https://docs.iotex.io)
- [DID Method Specification for IoTeX](https://github.com/iotexproject/ioID-DID-Method)