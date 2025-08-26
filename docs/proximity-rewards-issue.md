# Proximity Proof Rewards Issue

## Problem
When running the proximity proof workflow, step 4 (claim rewards) fails with "No rewards to claim" even though the verification transaction succeeds and the contract has 10 IOTX balance.

## Root Cause
The current IoTeX Device Verifier V2 contract (`0x5967d15c7a6fD3ef7F1f309e766f35252a9de10d`) uses the real Nova Decider contract (`0xAD5f0101B94F581979AA22F123b7efd9501BfeB3`) for cryptographic proof verification.

### What's Happening:
1. Device registration succeeds ✅
2. Proximity proof is generated (but uses placeholder data) ✅
3. Verification transaction is sent to the contract ✅
4. The contract calls Nova Decider to verify the proof ❌
5. Nova Decider returns `false` because the proof is invalid
6. Contract doesn't add rewards when verification fails
7. Transaction succeeds but `deviceRewards[deviceId]` remains 0
8. Claim rewards fails because there are no rewards to claim

### Code Flow:
```solidity
// In IoTeXDeviceVerifierV2.sol
bool isValid = NOVA_DECIDER.verifyNovaProof(...);

if (isValid) {
    // This code never runs because isValid is false
    deviceRewards[deviceId] += REWARD_PER_PROOF;
}
```

## Why Placeholder Proofs Don't Work
The Nova Decider does real cryptographic verification:
- Verifies the Groth16 proof points (pA, pB, pC)
- Checks KZG commitments and challenges
- Validates the entire proof structure

Our placeholder data from `nova-proof-formatter.js` generates deterministic hex values that look valid but fail cryptographic verification.

## Solutions

### 1. Use Mock Contract (Recommended for Testing)
Deploy `IoTeXDeviceVerifierMockSimple.sol` which:
- Doesn't use Nova Decider
- Does simple coordinate checking
- Has a reward pool mechanism
- Always returns true for valid coordinates

### 2. Generate Real Nova Proofs
- Requires proper zkEngine integration
- Need actual proximity circuit execution
- Must produce cryptographically valid proofs
- Complex and time-consuming

### 3. Deploy Modified V2 Contract
Create a testing version that:
- Bypasses Nova Decider for test addresses
- Falls back to coordinate checking
- Allows testing reward flow

## Current Workaround
The mock contract checks if device is within 100 units of (5000, 5000) and adds rewards from a funded pool:

```solidity
bool withinProximity = _checkProximity(x, y);

if (withinProximity && rewardPool >= REWARD_PER_PROOF) {
    deviceRewards[deviceId] += REWARD_PER_PROOF;
    rewardPool -= REWARD_PER_PROOF;
}
```

## Next Steps
1. Deploy the mock contract to IoTeX testnet
2. Update config to use mock contract address
3. Fund the mock contract's reward pool
4. Test the complete workflow with rewards

## Contract Addresses
- Current V2: `0x5967d15c7a6fD3ef7F1f309e766f35252a9de10d` (uses real verification)
- Nova Decider: `0xAD5f0101B94F581979AA22F123b7efd9501BfeB3` (cryptographic verification)
- Mock: Not yet deployed (simple coordinate checking)