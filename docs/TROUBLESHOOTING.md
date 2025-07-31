# Troubleshooting Guide

## Multi-Chain Verification Issues

### Avalanche Verification 404 Errors (Resolved)

**Issue**: Avalanche verification was failing with 404 errors while Ethereum and Base verification worked correctly with the same proofs.

**Root Cause**: A debug script (`test-avalanche-bypass.js`) was intercepting Avalanche verification calls and overriding the proper verifier functionality. This bypass script was:
- Using incorrect API endpoint formats
- Not properly checking if proofs existed
- Preventing the actual avalanche-verifier.js from handling requests

**Solution**: 
1. Disable/remove the `test-avalanche-bypass.js` script
2. Ensure only the proper `avalanche-verifier.js` handles verification
3. All verifiers now use the same API endpoint: `/api/proof/{proofId}/ethereum`

**Key Lesson**: Debug and bypass scripts can interfere with production functionality. Always check for conflicting scripts when experiencing inconsistent behavior between similar components.

### Common Issues and Solutions

#### 1. Proof Not Found (404 Error)
- **Cause**: Proofs are automatically cleaned up after 7 days
- **Solution**: Always use recently generated proofs for verification
- **Prevention**: Generate fresh proofs immediately before verification

#### 2. Chain Connection Issues
- **Cause**: Auto-connection on page refresh was causing reload loops
- **Solution**: Connections now happen on-demand when clicking verify buttons
- **Prevention**: Don't refresh page between generation and verification

#### 3. Insufficient Funds on Base
- **Cause**: High gas prices on Base testnet
- **Solution**: Gas price is now capped at 0.1 gwei for testnet transactions
- **Configuration**: Set in `base-verifier.js`

#### 4. Page Refresh on Button Click
- **Cause**: Form submission default behavior
- **Solution**: Event handlers now properly prevent default behavior
- **Implementation**: See `avalanche-verify-wrapper.js` and `base-verify-wrapper.js`

## Configuration Notes

### API Endpoints
All blockchain verifiers use the same endpoint format:
- Ethereum: `/api/proof/{proofId}/ethereum`
- Base: `/api/proof/{proofId}/ethereum`
- Avalanche: `/api/proof/{proofId}/ethereum`
- Solana: `/api/proof/{proofId}/solana`

### Contract Addresses
- Ethereum Sepolia: `0x09378444046d1ccb32ca2d5b44fab6634738d067`
- Base Sepolia: `0x74D68B2481d298F337e62efc50724CbBA68dCF8f`
- Avalanche Fuji: `0x30e93E8B0804fD60b0d151F724c307c61Be37EE1`

### Important Files
- `/static/avalanche-verifier.js` - Main Avalanche verification logic
- `/static/base-verifier.js` - Base verification with gas price capping
- `/static/ethereum-verifier.js` - Ethereum verification
- `/static/js/ui/avalanche-verify-wrapper.js` - Prevents page refresh
- `/static/js/ui/base-verify-wrapper.js` - Prevents page refresh

### Scripts to Avoid
The following scripts have been removed as they interfere with proper functionality:
- `test-avalanche-bypass.js` - Intercepted and broke Avalanche verification
- `fix-avalanche-fetch.js` - Attempted to fix non-existent issues
- `debug-*.js` - Various debug scripts that should not be in production