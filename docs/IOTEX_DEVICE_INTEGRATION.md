# IoTeX Device Proximity Proof Integration

## Overview
The Verifiable Agent Kit now supports IoTeX blockchain for IoT device proximity verification, replacing the generic location proof with a real-world use case.

## What's Implemented

### 1. IoTeX Chain Support
- **Network**: IoTeX Testnet (Chain ID: 4690)
- **RPC**: https://babel-api.testnet.iotex.io
- **Explorer**: https://testnet.iotexscan.io
- **Native Token**: IOTX

### 2. Device Proximity Proof Type
- **Proof Type**: `prove_device_proximity` (type 4)
- **Purpose**: Proves IoT device is within 100 units of center (5000, 5000)
- **Privacy**: Location data remains private, only proximity is proven

### 3. Frontend Components
- **IoTeX Verifier**: `/static/iotex-device-verifier.js`
- **UI Elements**: Connect banner, wallet status, verification buttons
- **Styling**: Teal/green theme (#00D4B5) for IoTeX branding

### 4. Sample Commands
- "Register IoT device DEV123 with proximity proof"
- "Register device IOT001 and if proximity verified on IoTeX, enable rewards"

## How It Works

### 1. Device Registration
```javascript
// Register device with unique ID
await verifier.registerDevice('DEV123');
```

### 2. Proximity Verification
```javascript
// Generate proximity proof showing device is within range
// Center: (5000, 5000), Radius: 100 units
await verifier.verifyProximity(proofData, 'DEV123');
```

### 3. Reward Eligibility
- Devices within proximity become eligible for rewards
- Rewards can be claimed through the UI
- Integration with IOTX tokens for incentives

## Technical Architecture

### Proof Generation Flow
1. User: "Register device DEV123"
2. Parser: Creates `register_device` + `generate_proof` steps
3. Rust: Generates Nova proof with type 4 (device_proximity)
4. Frontend: Shows IoTeX verification button
5. IoTeX: Verifies proximity and enables rewards

### Contract Interface (Deployed)
```solidity
interface IDeviceVerifier {
    function registerDevice(bytes32 deviceId, address owner) external;
    function verifyDeviceProximity(
        Groth16Proof memory proof,
        uint256[32] memory publicInputs,
        bytes32 deviceId,
        bytes memory signature
    ) external returns (bool);
    function claimRewards(bytes32 deviceId) external;
}
```

## Current Status

### ✅ Completed
- IoTeX chain configuration
- Frontend verifier implementation
- UI/UX integration
- Proof type support in backend
- Sample queries and commands

### ✅ Deployed Contracts (REAL)
- **Groth16 Verifier (6-signal)**: `0x9948D8d9Cc8848653c062a5Fdcfea931535DF81A`
- **System Contract**: `0xC1BAa1a7A001aC7a476F60ECB5050f8fd6d211DE`
- **Network**: IoTeX Testnet (Chain ID: 4690)
- **Explorer**: [Verifier](https://testnet.iotexscan.io/address/0x9948D8d9Cc8848653c062a5Fdcfea931535DF81A) · [System](https://testnet.iotexscan.io/address/0xC1BAa1a7A001aC7a476F60ECB5050f8fd6d211DE)
- **Deployer**: `0xE616B2eC620621797030E0AB1BA38DA68D78351C`
- **Features**: REAL registration, REAL Groth16 verification, REAL rewards

### 🚧 Pending
- Integrate with IoTeX ioID registry
- Real device signature verification
- Production proximity circuit

## Testing

### Current Status
- ✅ Contracts deployed to IoTeX testnet
- ✅ Frontend integration complete
- ✅ Device registration functional
- ✅ Proximity verification fully REAL (6 public signals)
- ✅ Rewards claimable on success

### To Test
1. Open UI: `http://localhost:8001/`
2. Backend runs inside Rust server (no separate 8007 service)
3. Run workflow: register device → zkEngine proof → Groth16 verification → rewards
4. Step 3 shows: Groth16 Verifier link + Verification TX link
5. Step 4 shows reward claim TX when applicable

## Future Enhancements

1. **Real Circuit Integration**
   - Import ProximityCircuit from device_registration repo
   - Use actual Nova IVC proving

2. **Contract Deployment**
   - Deploy Nova Decider with KZG verification
   - Integrate with ioID registry

3. **Device Management**
   - Device dashboard showing all registered devices
   - Historical proximity proofs
   - Reward tracking

4. **Multi-Chain Support**
   - Deploy device verifiers on other chains
   - Cross-chain device identity

## Benefits Over Location Proof

| Feature | Generic Location | Device Proximity |
|---------|-----------------|------------------|
| Use Case | Theoretical | Real IoT devices |
| Privacy | Basic | Advanced (hides exact location) |
| Incentives | None | Built-in rewards |
| Identity | None | Device IDs with signatures |
| Business Value | Low | High (IoT networks) |

## Resources
- [IoTeX Documentation](https://docs.iotex.io)
- [IoTeX Testnet Faucet](https://faucet.iotex.io)
- [Device Registration Demo](https://github.com/ICME-Lab/device_registration)
