# Proximity Proof Testing Guide

## Overview
We've implemented a zkEngine calldata parser to handle the binary proof format from zkEngine and convert it to the format expected by the IoTeX smart contract.

## Testing the Parser

### 1. Browser-Based Test Page
Open the test page in your browser:
```
http://localhost:8000/tests/test-proximity-browser.html
```

This page will:
- Load the zkEngine calldata parser
- Create a simulated proof in the same format as zkEngine
- Parse the binary proof data
- Format it for the IoTeX contract
- Display results showing all components are properly extracted

### 2. Direct Parser Test Page
For more detailed testing:
```
http://localhost:8000/tests/test-parser-directly.html
```

This page provides:
- Buttons to test with different proof formats
- Detailed logging of parsing steps
- Validation of all proof components

### 3. Full Workflow Test
To test the complete proximity proof workflow:

```bash
# In the browser console or chat interface:
"Register IoT device DEV123 with proximity proof at location 5050,5050"
```

Note: This requires:
- MetaMask to be connected to IoTeX network
- The device registration step may fail due to network switching issues
- Check browser console for detailed parser output during proof generation

## What the Parser Does

1. **Decodes Base64 Proof**: Takes the base64-encoded binary from zkEngine
2. **Extracts Field Elements**: Reads 32-byte field elements from the binary
3. **Maps to Contract Format**: Organizes elements into the 9 parameters expected by IoTeX:
   - `i_z0_zi`: Initial state (x, y) and result
   - `U_i_cmW_U_i_cmE`: U commitments (4 elements)
   - `u_i_cmW`: u commitment (2 elements)
   - `cmT_r`: T commitment (3 elements)
   - `pA`, `pB`, `pC`: Groth16 proof points
   - `challenge_W_challenge_E_kzg_evals`: KZG challenges
   - `kzg_proof`: KZG proof matrix

4. **Converts to Hex**: Formats all values as 0x-prefixed 64-character hex strings

## Expected Output

When the parser works correctly, you should see:
```
✅ Parser loaded successfully
✅ Successfully parsed proof components:
  - i_z0_zi: 3 elements
  - U_i_cmW_U_i_cmE: 4 elements
  - pA: 2 elements
  - pB: 2x2 matrix
✅ Successfully formatted for IoTeX contract
✅ All required components present!
✅ Parser is working correctly!
```

## Troubleshooting

### Network Switching Error
If you see "The request has been rejected due to a change in selected network":
- This happens during device registration
- Make sure MetaMask is on IoTeX network before starting
- The parser itself works independently of network issues

### Proof Not Found
If you see "Failed to get proof data: Not Found":
- The proof generation step must complete first
- Check that zkEngine server is running on port 8001
- Look for proof generation logs in the console

### Parser Errors
Check browser console for detailed error messages:
- "Not enough bytes": Proof data is too small
- "Only found X field elements": Proof doesn't contain enough data
- Look for fallback parsing attempts (JSON format, public inputs)

## Integration Status

✅ **Completed**:
- zkEngine calldata parser implementation
- Binary to decimal string conversion
- Hex formatting for contract
- Integration with nova-proof-formatter
- Test pages for validation

⚠️ **Known Issues**:
- Device registration requires MetaMask network switching
- Full workflow testing blocked by network change errors
- Actual zkEngine proof verification depends on proper proof structure

## Next Steps

1. Test with actual zkEngine proof output (not simulated)
2. Verify contract accepts the formatted proof
3. Ensure coordinates are properly extracted from proof
4. Test reward claiming after successful verification