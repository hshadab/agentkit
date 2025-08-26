# Real Nova Decider Integration

## Discovery

The device_registration demo already has a **real Nova Decider** deployed on IoTeX testnet!

### Existing Deployment
- **Nova Decider**: `0xAD5f0101B94F581979AA22F123b7efd9501BfeB3`
- **Network**: IoTeX Testnet
- **Verification**: Real cryptographic Nova proof verification with KZG

### What This Means

Instead of our simplified demo contract that just returns `true`, we can use the actual Nova Decider that:
1. Verifies real Nova IVC proofs
2. Uses KZG commitments
3. Performs actual cryptographic verification
4. Follows the exact device_registration approach

### Contract Interface

```solidity
interface INovaDecider {
    function verifyNovaProof(
        uint256[3] calldata i_z0_zi, 
        uint256[4] calldata U_i_cmW_U_i_cmE, 
        uint256[2] calldata u_i_cmW, 
        uint256[3] calldata cmT_r, 
        uint256[2] calldata pA, 
        uint256[2][2] calldata pB, 
        uint256[2] calldata pC, 
        uint256[4] calldata challenge_W_challenge_E_kzg_evals, 
        uint256[2][2] calldata kzg_proof
    ) external view returns (bool);
}
```

### Updated Contract (IoTeXDeviceVerifierV2.sol)

Created a new contract that:
1. Interfaces with the real Nova Decider
2. Keeps our device registration and reward logic
3. Calls the actual cryptographic verifier

### To Deploy and Use

1. Deploy IoTeXDeviceVerifierV2.sol to IoTeX testnet
2. Fund it with IOTX for rewards
3. Update frontend to format Nova proofs correctly
4. Generate real Nova proofs using device_registration tools

### What's Still Needed

To generate real Nova proofs that work with this verifier:
1. Use the device_registration Rust code to generate proofs
2. Format the proof calldata correctly
3. Submit to our contract which calls the real verifier

This makes the demo **significantly more real** - using actual cryptographic verification instead of simulation!