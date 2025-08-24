# Circle Gateway EIP-712 Signature Fix Documentation

## Executive Summary

On August 24, 2025, we resolved a critical EIP-712 signature verification issue in the Circle Gateway integration that was preventing successful USDC transfers. The fix involved correcting the field ordering in the TransferSpec type definition and migrating from CDN dependencies to local libraries.

## Problem Description

### Symptoms
1. **Primary Error**: "Invalid signature: recovered signer does not match sourceSigner"
2. **HTTP Status**: 400 Bad Request from Circle Gateway API
3. **Local vs Remote**: Signatures verified locally but were rejected by Circle's API
4. **Timing**: System was working on August 23, 2025 (commit 34e909f) but broke after subsequent changes

### Root Causes

#### 1. Incorrect Field Ordering in TransferSpec
The `value` field was incorrectly positioned at index 4 (after `destinationDomain`) when it should have been at index 12 (before `salt`).

**Incorrect Order (Broken)**:
```javascript
TransferSpec: [
    { name: "version", type: "uint32" },
    { name: "sourceDomain", type: "uint32" },
    { name: "destinationDomain", type: "uint32" },
    { name: "value", type: "uint256" },  // WRONG POSITION
    { name: "sourceContract", type: "bytes32" },
    // ... other fields
]
```

**Correct Order (Fixed)**:
```javascript
TransferSpec: [
    { name: "version", type: "uint32" },
    { name: "sourceDomain", type: "uint32" },
    { name: "destinationDomain", type: "uint32" },
    { name: "sourceContract", type: "bytes32" },
    { name: "destinationContract", type: "bytes32" },
    { name: "sourceToken", type: "bytes32" },
    { name: "destinationToken", type: "bytes32" },
    { name: "sourceDepositor", type: "bytes32" },
    { name: "destinationRecipient", type: "bytes32" },
    { name: "sourceSigner", type: "bytes32" },
    { name: "destinationCaller", type: "bytes32" },
    { name: "value", type: "uint256" },  // CORRECT POSITION (12)
    { name: "salt", type: "bytes32" },
    { name: "hookData", type: "bytes" }
]
```

#### 2. CDN Dependency Failures
Multiple JavaScript libraries were failing to load from CDNs:
- `web3.min.js` - NS_ERROR_UNKNOWN_HOST
- `snarkjs.min.js` - Connection failures
- `solana-web3.min.js` - DNS resolution issues
- `ethers-5.7.2.umd.min.js` - CDN timeout

## Solution Implementation

### Step 1: Migrate to Local Libraries
Downloaded all dependencies and updated references in `index.html`:

```html
<!-- Before (CDN) -->
<script src="https://cdn.jsdelivr.net/npm/web3@latest/dist/web3.min.js"></script>

<!-- After (Local) -->
<script src="./js/lib/web3.min.js"></script>
```

### Step 2: Fix TransferSpec Field Ordering
Updated all three occurrences of TransferSpec definition in `gateway-workflow-manager-v2.js`:
- Line 850-865 (Type definition)
- Line 1072-1087 (Programmatic signing)
- Line 1365-1380 (MetaMask signing)

### Step 3: Correct Domain Configuration
Ensured minimal domain structure without chainId:

```javascript
const domain = {
    name: "GatewayWallet",
    version: "1"
    // No chainId or verifyingContract
};
```

### Step 4: Fix Type Definitions
Corrected the version field type from uint8 to uint32:

```javascript
{ name: "version", type: "uint32" }  // Was uint8, must be uint32
```

## Technical Deep Dive

### EIP-712 Structured Data Signing

EIP-712 defines a standard for hashing and signing typed structured data. The signature depends on:
1. **Domain Separator**: Identifies the verifying contract
2. **Type Hash**: Keccak256 hash of the type definition string
3. **Data Hash**: Recursive encoding of the actual data

### Why Field Order Matters

The type hash is computed from the canonical string representation:
```
keccak256("TransferSpec(uint32 version,uint32 sourceDomain,...)")
```

If fields are in the wrong order, the type hash differs, causing signature verification to fail.

### Circle's Implementation

Circle's Gateway API expects:
1. Exact field ordering as defined in their smart contracts
2. All addresses encoded as bytes32 (left-padded with zeros)
3. Minimal domain without chain-specific parameters
4. BigNumber conversion for numeric values during signing

## Verification Process

### Local Testing
Created test script `test-reverted-field-order.mjs` that:
1. Creates burn intent with correct field order
2. Signs with ethers.js `_signTypedData`
3. Verifies locally with `verifyTypedData`
4. Submits to Circle API

### Successful Test Results
```
Transfer ID: 0c4d30d9-7f30-484d-a538-9606f3c40087
Total fees: 2.00005 USDC
Status: SUCCESS
```

### API Response Structure
```json
{
  "attestation": "0xff6fb334...",
  "signature": "0x4373328d...",
  "transferId": "0c4d30d9-7f30-484d-a538-9606f3c40087",
  "fees": {
    "total": "2.00005",
    "token": "USDC",
    "perIntent": [{
      "domain": 0,
      "baseFee": "2",
      "transferFee": "0.00005"
    }]
  }
}
```

## Lessons Learned

### 1. Version Control Analysis
Always check git history when functionality breaks:
```bash
git diff HEAD~1 -- path/to/file
git show commit:path/to/file
```

### 2. Field Ordering Documentation
EIP-712 field order is critical and often underdocumented. When integrating with third-party APIs:
- Check their smart contract source code
- Test with minimal examples
- Document working configurations

### 3. Dependency Management
CDN dependencies introduce failure points:
- Always have local fallbacks
- Version-lock dependencies
- Monitor CDN availability

### 4. Debugging Strategy
Systematic approach to signature debugging:
1. Verify local signature generation
2. Check type definitions match exactly
3. Confirm field ordering
4. Validate domain parameters
5. Test with minimal examples

## Production Recommendations

### 1. Configuration Management
```javascript
// config/gateway.js
export const GATEWAY_CONFIG = {
  domain: {
    name: "GatewayWallet",
    version: "1"
  },
  types: {
    // Frozen type definitions
  }
};
```

### 2. Type Definition Validation
```javascript
function validateTypeDefinition(types) {
  const expectedHash = "0x..."; // Known working type hash
  const actualHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(canonicalizeTypes(types))
  );
  if (actualHash !== expectedHash) {
    throw new Error("Type definition mismatch");
  }
}
```

### 3. Integration Testing
```javascript
describe("Gateway Integration", () => {
  it("should match Circle's expected signature", async () => {
    const signature = await signBurnIntent(testIntent);
    const response = await submitToCircle(signature);
    expect(response.status).toBe(200);
  });
});
```

### 4. Monitoring
- Log all signature generations with type hashes
- Alert on signature verification failures
- Track success/failure rates
- Monitor Circle API response patterns

## Migration Guide

For projects experiencing similar issues:

### Step 1: Identify Current Configuration
```javascript
console.log(JSON.stringify(types, null, 2));
```

### Step 2: Compare with Working Configuration
Use the exact type definitions from this document.

### Step 3: Update Field Ordering
Ensure `value` field is at position 12 (after all address fields).

### Step 4: Test with Circle API
```bash
node test-reverted-field-order.mjs
```

### Step 5: Update Production Code
Apply changes to all signature generation points.

## References

- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- [Circle Gateway Documentation](https://developers.circle.com/docs/gateway-overview)
- [Ethers.js Typed Data Signing](https://docs.ethers.io/v5/api/signer/#Signer-signTypedData)
- Working Implementation: `/static/js/ui/gateway-workflow-manager-v2.js`

## Support

For issues related to this fix:
1. Check TransferSpec field ordering
2. Verify domain configuration
3. Ensure local libraries are loaded
4. Test with provided scripts
5. Compare with working commit 34e909f

---

*Document Version: 1.0*  
*Last Updated: August 24, 2025*  
*Fix Implemented By: Claude Assistant with Human Verification*