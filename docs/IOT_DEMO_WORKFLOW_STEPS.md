# IoT Device Demo - Detailed Workflow Steps

## Overview
This document shows the actual workflow steps that demonstrate the power of combining zero-knowledge proofs, IoTeX blockchain, and device identity management in the Verifiable Agent Kit.

## Demo Workflow: Complete Device Registration & Verification

### User Command
```
"Register device WEATHER_STATION_01 at location 5080,5020"
```

### Backend Workflow Steps Generated

```json
{
  "workflow_id": "wf_iot_123",
  "steps": [
    {
      "id": "step_1",
      "type": "register_device",
      "description": "Register IoT device on IoTeX blockchain",
      "parameters": {
        "device_id": "WEATHER_STATION_01",
        "device_type": "sensor"
      },
      "blockchain": "iotex",
      "expected_output": {
        "ioId": "12345",
        "did": "did:io:12345",
        "transaction": "0xabc123..."
      }
    },
    {
      "id": "step_2", 
      "type": "generate_proof",
      "description": "Generate zero-knowledge proximity proof",
      "parameters": {
        "proof_type": "device_proximity",
        "device_id": "WEATHER_STATION_01",
        "location": {
          "x": "5080",
          "y": "5020"
        },
        "privacy_mode": "zero_knowledge"
      },
      "zkengine": {
        "circuit": "nova_proximity",
        "public_inputs": ["x", "y"],
        "private_inputs": ["distance_calculation"],
        "output": "within_radius_boolean"
      }
    },
    {
      "id": "step_3",
      "type": "verify_on_iotex",
      "description": "Verify proximity proof on IoTeX blockchain",
      "parameters": {
        "proof_id": "{{step_2.proof_id}}",
        "device_did": "{{step_1.did}}",
        "auto_switch_network": true
      },
      "smart_contract": "NovaDecider",
      "expected_gas": "0.01 IOTX"
    }
  ]
}
```

## Detailed Step Execution

### Step 1: Device Registration with ioID

**UI Display:**
```
🔄 Registering device WEATHER_STATION_01...
   → Creating device identity on IoTeX blockchain
   → Switching to IoTeX network (Chain ID: 4690)
```

**What Happens:**
1. **MetaMask Network Switch**
   - Auto-prompts to switch to IoTeX Testnet
   - RPC: `https://babel-api.testnet.iotex.io`

2. **ioID Creation Transaction**
   ```javascript
   ioIDContract.createDeviceIdentity({
     projectId: 1,
     deviceId: keccak256("WEATHER_STATION_01"),
     metadata: {
       name: "WEATHER_STATION_01",
       type: "sensor",
       owner: "0xUserAddress",
       created: "2024-01-27T10:30:00Z"
     }
   })
   ```

3. **Result:**
   ```
   ✅ Device registered with ioID: 12345
   📋 DID: did:io:12345
   🔗 Transaction: 0xabc123... (view on IoTeXScan)
   ```

### Step 2: Zero-Knowledge Proximity Proof Generation

**UI Display:**
```
🔐 Generating privacy-preserving proximity proof...
   → Location: (5080, 5020)
   → Proving: Within 100 units of center
   → Privacy: Exact location remains hidden
```

**What Happens:**
1. **Nova Circuit Execution**
   ```rust
   // Private computation (not revealed)
   distance = sqrt((5080-5000)² + (5020-5000)²) = 82.46
   within_radius = distance < 100 = true
   
   // Public output
   proof = prove(x=5080, y=5020, within_radius=true)
   ```

2. **Proof Components Generated:**
   - KZG commitments (hide the computation)
   - Groth16 proof points (cryptographic verification)
   - Public inputs (coordinates)
   - Private witness (distance calculation)

3. **Result:**
   ```
   ✅ Proximity proof generated
   🔒 Privacy preserved: Only proximity status revealed
   ⏱️ Generation time: 15.2 seconds
   📦 Proof size: 18.8 MB
   ```

### Step 3: On-Chain Verification

**UI Display:**
```
🌐 Verifying proof on IoTeX blockchain...
   → Submitting to Nova Decider contract
   → Device: did:io:12345
   → Estimated gas: 0.01 IOTX
```

**What Happens:**
1. **Smart Contract Call**
   ```javascript
   novaDecider.verifyDeviceProximity(
     proofData,      // Zero-knowledge proof
     deviceDID,      // did:io:12345
     proofId         // Unique identifier
   )
   ```

2. **On-Chain Verification:**
   - Cryptographic proof verification
   - Device identity check (ioID exists)
   - Proximity status recording
   - Reward eligibility update

3. **Result:**
   ```
   ✅ Proof verified on IoTeX!
   📍 Status: Device within proximity zone
   💰 Rewards: Eligible for 0.01 IOTX
   🔗 Transaction: 0xdef456... (view on IoTeXScan)
   ```

## Advanced Workflow: Conditional Actions

### Example: Device Network with Conditional Rewards
```
"Register 3 weather stations and if all are within proximity, enable network rewards"
```

**Generated Workflow:**
```json
{
  "steps": [
    {
      "id": "register_devices",
      "type": "parallel_execution",
      "substeps": [
        { "type": "register_device", "device_id": "STATION_01" },
        { "type": "register_device", "device_id": "STATION_02" },
        { "type": "register_device", "device_id": "STATION_03" }
      ]
    },
    {
      "id": "generate_proofs",
      "type": "parallel_execution",
      "substeps": [
        { "type": "generate_proof", "device_id": "STATION_01", "x": "5050", "y": "5050" },
        { "type": "generate_proof", "device_id": "STATION_02", "x": "5080", "y": "5020" },
        { "type": "generate_proof", "device_id": "STATION_03", "x": "4980", "y": "5040" }
      ]
    },
    {
      "id": "verify_all",
      "type": "batch_verification",
      "description": "Verify all devices in single transaction",
      "parameters": {
        "devices": ["{{register_devices.results}}"],
        "proofs": ["{{generate_proofs.results}}"]
      }
    },
    {
      "id": "conditional_reward",
      "type": "conditional_execution",
      "condition": "all_devices_within_proximity",
      "true_action": {
        "type": "enable_network_rewards",
        "reward_pool": "0.1 IOTX",
        "distribution": "equal"
      },
      "false_action": {
        "type": "log_message",
        "message": "Not all devices in range"
      }
    }
  ]
}
```

## Workflow Capabilities Demonstrated

### 1. **Blockchain Integration**
- Automatic network switching
- Multi-transaction workflows
- Gas optimization for batch operations

### 2. **Privacy Features**
- Zero-knowledge proofs hide exact locations
- Only necessary information revealed
- Cryptographic guarantees

### 3. **Identity Management**
- W3C DID standard compliance
- IoTeX ioID integration
- Cross-reference between systems

### 4. **Conditional Logic**
- If-then conditions based on proof results
- Multi-device coordination
- Automated reward distribution

### 5. **Real-World Applications**
- Weather station networks
- Smart city sensors
- Supply chain tracking
- Environmental monitoring

## Benefits Over Traditional IoT

| Traditional IoT | Verifiable Agent Kit with IoTeX |
|----------------|----------------------------------|
| Centralized servers | Decentralized blockchain |
| Location data exposed | Zero-knowledge privacy |
| Trust in provider | Cryptographic verification |
| Manual verification | Automated smart contracts |
| No native incentives | Built-in reward system |
| Siloed identity | Portable DID standard |

## Try It Yourself

### Simple Device Registration:
```
"Register device TEMP_SENSOR_01 at location 5050,5050"
```

### Device with Verification:
```
"Register device GATEWAY_01 and verify on IoTeX"
```

### Multi-Step Workflow:
```
"Register IoT device DEV123 with proximity proof and if verified enable rewards"
```

Each command triggers a sophisticated workflow combining:
- Blockchain identity (ioID)
- Privacy-preserving proofs (Nova)
- Smart contract verification
- Automated execution

This demonstrates the future of IoT: decentralized, private, and verifiable!