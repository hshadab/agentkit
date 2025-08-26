# Device Proximity Proof Analysis

## The Issue
The coordinate mismatch warning shows:
- Requested: (5050, 5050)  
- In proof: (79228162514264337602133884928, 396140812571321687967719751680)

These large numbers are NOT coordinates - they are cryptographic field elements from the zkSNARK proof.

## Understanding zkEngine Proofs

### 1. Input to zkEngine
When we call zkEngine for device proximity:
```bash
zkEngine prove --wasm device_proximity.wasm --out-dir /path --step 10 DEV123 5050 5050
```
- Arguments: [device_id, x, y]

### 2. What zkEngine Does
- Takes the WASM program (device_proximity.wasm)
- Executes it with the input arguments
- Generates a cryptographic proof that the computation was done correctly
- The proof contains field elements, NOT the original inputs

### 3. Proof Structure
The Nova proof contains:
- `i_z0_zi`: Initial and final states (cryptographic commitments)
- Various other cryptographic elements (U, u, cmT, pA, pB, pC, etc.)

These are NOT human-readable values!

## The Actual Problem

The issue is NOT with coordinate parsing or passing. The coordinates ARE being passed correctly to zkEngine (5050, 5050).

The real issues are:

1. **Misleading Warning**: The proof verification monitor is comparing cryptographic field elements to coordinates, which is meaningless.

2. **Contract Verification**: The IoTeX contract needs to verify the Nova proof correctly. If rewards aren't being added, it could be because:
   - The proof format doesn't match what the contract expects
   - The contract's proximity check logic differs from the WASM program
   - The proof is valid but the contract has additional requirements

## What Should Happen

1. zkEngine generates a proof that device at (5050, 5050) is within 100 units of (5000, 5000)
2. The proof is submitted to the IoTeX contract
3. The contract verifies the cryptographic proof
4. If valid AND the proof shows proximity, rewards are added

## Debugging Steps

1. **Check Public Inputs**: The actual coordinates should be in the public inputs
2. **Verify WASM Logic**: Ensure device_proximity.wasm calculates distance correctly
3. **Contract Logic**: Check if the contract expects specific values in i_z0_zi[2] for proximity

## The Fix

The coordinate parsing fixes are working correctly. The issue is likely:
- The proof format expected by the contract
- The proximity calculation in the WASM
- How the contract interprets the proof result