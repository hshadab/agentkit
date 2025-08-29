# Deploy Real IoTeX Smart Contract

## Prerequisites

1. **Get IoTeX Testnet IOTX**:
   - Visit: https://faucet.iotex.io/
   - Enter your wallet address
   - Get at least 1.0 IOTX for deployment + gas

2. **Set Private Key**:
   Add your IoTeX wallet private key to `.env` file:
   ```bash
   echo "IOTEX_PRIVATE_KEY=your_private_key_here" >> .env
   ```

## Deploy Contract

```bash
npx hardhat run scripts/deploy-real-contract.js --network iotex_testnet
```

## What Gets Deployed

The `IoTeXProximityVerifier` smart contract with:

### Smart Contract Functions:
- `registerDevice(bytes32 deviceId, string deviceType)` → Returns (ioId, did)
- `verifyDeviceProximity(bytes32 deviceId, NovaProof proof, uint256[4] publicInputs)` → Returns (verified, reward)
- `claimRewards(bytes32 deviceId)` → Returns claimed amount
- `getDevice(bytes32 deviceId)` → Returns device data

### Nova Proof Structure:
```solidity
struct NovaProof {
    uint256[3] i_z0_zi;          // Initial/final state
    uint256[4] U_i_cmW_U_i_cmE;  // Large commitments  
    uint256[2] u_i_cmW;          // Small commitment
    uint256[3] cmT_r;            // T commitment + randomness
    uint256[2] pA;               // Groth16 proof point A
    uint256[2][2] pB;            // Groth16 proof point B  
    uint256[2] pC;               // Groth16 proof point C
    uint256[4] challenge_W_challenge_E_kzg_evals; // KZG challenges
    uint256[2][2] kzg_proof;     // KZG proof
}
```

### Fee Structure:
- Registration: 0.01 IOTX
- Verification: 0.001 IOTX  
- Reward: 0.1 IOTX per successful verification

## After Deployment

1. Contract address will be saved to `deployed-contract-info.json`
2. Update `static/js/core/config.js` with new contract address
3. Test real smart contract functions via UI

## Verification Features

- **Cryptographic Proximity Verification**: Uses Nova recursive SNARKs
- **Device Identity**: W3C-compliant DID generation
- **Reward Distribution**: Automatic IOTX rewards for valid proofs
- **Event Emission**: DeviceRegistered, ProximityVerified, RewardsClaimed events