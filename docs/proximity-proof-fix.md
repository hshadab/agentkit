# Proximity Proof Fix Documentation

## Overview
This document describes the fix implemented for IoTeX device proximity proof verification, addressing the mismatch between zkEngine's binary proof output and the IoTeX contract's expected input format.

## Problem
The zkEngine outputs proof data as a binary file (`proof.bin`) that contains a bincode-serialized CompressedSNARK. However, the IoTeX smart contract expects the proof components to be provided as decimal strings in a specific structure.

## Solution
Created a new `ZKEngineCalldataParser` that:
1. Decodes the base64-encoded binary proof data from zkEngine
2. Parses the binary format to extract field elements
3. Converts the field elements to decimal strings
4. Formats them into the structure expected by the IoTeX contract

## Implementation Details

### Parser Location
- `/home/hshadab/agentkit/static/parsers/nova/zkengine-calldata-parser.js`

### Key Components
The parser extracts and formats these components for the IoTeX verifier:
- `i_z0_zi`: Initial and final state (3 elements)
- `U_i_cmW_U_i_cmE`: U commitments (4 elements)
- `u_i_cmW`: u commitment (2 elements)
- `cmT_r`: T commitment and randomness (3 elements)
- `pA`, `pB`, `pC`: Groth16 proof points
- `challenge_W_challenge_E_kzg_evals`: KZG challenges (4 elements)
- `kzg_proof`: KZG proof (2x2 elements)

### Integration
The parser is integrated into the proof formatting pipeline:
1. Added to `index.html` script includes
2. Updated `nova-proof-formatter.js` to try the calldata parser first
3. The parser handles multiple proof formats including binary, JSON, and fallback modes

## Technical Details

### Binary Format Parsing
- Uses little-endian byte order (as used by bincode)
- Extracts 32-byte field elements
- Converts to decimal strings for contract compatibility

### Fallback Mechanisms
1. Direct binary parsing
2. JSON-encoded proof parsing
3. Public inputs reconstruction
4. Placeholder generation (for testing)

## Testing
Created test file at `/home/hshadab/agentkit/tests/test-proximity-parsing.html` to verify:
- Binary proof parsing
- Field element extraction
- Decimal string conversion
- Contract formatting

## References
- zkEngine proof generation: [Arecibo prepare_calldata](https://github.com/wyattbenno777/arecibo/blob/wyatt_dev/src/onchain/compressed/mod.rs#L230)
- Device registration example: [ICME-Lab/device_registration](https://github.com/ICME-Lab/device_registration/blob/main/src/main.rs#L150)
- IoTeX contract interface: `IoTeXDeviceVerifierV2.sol`

## Future Improvements
1. Add proper elliptic curve point decompression for Groth16 points
2. Implement more robust binary format detection
3. Add verification of parsed proof structure before submission
4. Consider caching parsed proofs for performance