# IoT Device Proximity Demo

This demo showcases the complete IoT device proximity verification workflow using zero-knowledge proofs and the IoTeX blockchain.

## Prerequisites

1. **Start the Rust server** (handles proof generation):
   ```bash
   cargo run
   ```

2. OpenAI is called directly by Rust; no separate chat service is required.

3. Open the UI at http://localhost:8001

4. **Start the workflow responder** (simulates browser responses):
   ```bash
   node workflow_responder.js
   ```

## Running the Demo

Once all services are running, execute the demo:

```bash
node demo_device_proximity.js
```

## What the Demo Does

1. **Device Registration**: Registers a new IoT device on the IoTeX blockchain with ioID
2. **Proof Generation**: Creates a zero-knowledge proof that the device is within proximity of a target location
3. **Blockchain Verification**: Verifies the proof on the IoTeX testnet
4. **Reward Claiming**: Claims rewards for successful proximity verification

## View Results

Open http://localhost:8001 in your browser to see:
- Real-time workflow execution cards
- Device registration on IoTeX
- Proof generation progress
- Blockchain verification status
- Reward claiming results

## Technical Details

- **Target Location**: Center at (5000, 5000) with radius 100
- **Demo Device**: Placed at (5050, 5050) - within proximity
- **Blockchain**: IoTeX Testnet
- **Proof Type**: Nova → Groth16 SNARK

## Troubleshooting

If you encounter issues:

1. Check all services are running:
   ```bash
   ps aux | grep -E "(cargo|python3|node)"
   ```

2. Check service logs:
   ```bash
   tail -f /tmp/rust_server.log
   ```

3. Ensure MetaMask is connected to IoTeX Testnet
4. Check browser console for errors at http://localhost:8001
