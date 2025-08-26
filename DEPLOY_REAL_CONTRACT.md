# 🚀 Deploy Real IoTeX Smart Contract

## Step 1: Get IoTeX Testnet IOTX

1. Visit the IoTeX faucet: https://faucet.iotex.io/
2. Enter your wallet address (the one you'll deploy from)
3. Get at least **0.5 IOTX** for deployment and gas fees

## Step 2: Add Your Private Key

Add your IoTeX wallet private key to the `.env` file:

```bash
echo "IOTEX_PRIVATE_KEY=your_private_key_here" >> .env
```

**⚠️ Security Note**: Never commit your private key to git. It's already in .gitignore.

## Step 3: Deploy the Contract

Run the deployment script:

```bash
HARDHAT_CONFIG=hardhat.config.cjs npx hardhat run scripts/deploy-iotex-smart-contract.cjs --network iotex_testnet
```

## What Gets Deployed

### Smart Contract: `IoTeXProximityVerifier`

#### Core Functions:
- `registerDevice(bytes32 deviceId, string deviceType)` → Returns (ioId, did)
- `verifyDeviceProximity(deviceId, novaProof, publicInputs)` → Returns (verified, reward)  
- `claimRewards(bytes32 deviceId)` → Returns claimed amount
- `getDevice(bytes32 deviceId)` → Returns device data

#### Nova Proof Structure (11 Components):
```solidity
struct NovaProof {
    uint256[3] i_z0_zi;          // Initial/final state commitments
    uint256[4] U_i_cmW_U_i_cmE;  // Large folding commitments  
    uint256[2] u_i_cmW;          // Small commitment
    uint256[3] cmT_r;            // T commitment + randomness
    uint256[2] pA;               // Groth16 proof point A
    uint256[2][2] pB;            // Groth16 proof point B  
    uint256[2] pC;               // Groth16 proof point C
    uint256[4] challenge_W_challenge_E_kzg_evals; // KZG challenges
    uint256[2][2] kzg_proof;     // KZG polynomial commitment proof
}
```

#### Fee Structure:
- **Registration**: 0.01 IOTX per device
- **Verification**: 0.001 IOTX per proof
- **Reward**: 0.1 IOTX per successful verification

## Step 4: Update Frontend Configuration

After deployment, the script will save the contract address to `deployed-contract-info.json`.

Update `static/js/core/config.js`:

```javascript
iotex: {
    chainId: '0x1252',
    chainIdDecimal: 4690,
    contracts: {
        deviceVerifier: 'NEW_CONTRACT_ADDRESS_HERE', // Replace with deployed address
        // ... other contracts
    },
    // ... rest of config
}
```

## Step 5: Test Real Smart Contract

1. Refresh browser (hard refresh: Ctrl+F5)
2. Test workflow: "Prove device SENSOR1 at location 5080, 5020"
3. Should see: "Device registered via smart contract with Nova verification"
4. All transactions should work without "ErrExecutionReverted" errors

## Expected Output

```
🚀 Deploying Real IoTeX Proximity Verifier Contract...

📡 Deploying from account: 0xYourAddress
💰 Account balance: 1.0 IOTX

⏳ Deploying contract...
📤 Transaction hash: 0x...
✅ Contract deployed successfully!

📍 Address: 0xNewContractAddress
🔗 Explorer: https://testnet.iotexscan.io/address/0xNewContractAddress

✅ Contract functions working:
  📝 Registration fee: 0.01 IOTX
  🔍 Verification fee: 0.001 IOTX  
  🎁 Reward amount: 0.1 IOTX

🚀 Smart Contract Functions Available:
  📝 registerDevice(deviceId, deviceType) → (ioId, did)
  🔍 verifyDeviceProximity(deviceId, proof, publicInputs) → (verified, reward)
  🎁 claimRewards(deviceId) → amount
```

## Verification Features

- **Real Cryptographic Verification**: Nova recursive SNARKs
- **Device Identity**: W3C-compliant DID generation  
- **Proximity Constraints**: Cryptographic distance verification
- **Event Emissions**: DeviceRegistered, ProximityVerified, RewardsClaimed
- **Reward Distribution**: Automatic IOTX payouts for valid proofs

## Troubleshooting

- **"Insufficient IOTX"**: Get more from faucet
- **"Private key not found"**: Check .env file
- **"Network error"**: Verify IoTeX testnet is accessible
- **Gas errors**: Contract deployment uses ~2M gas