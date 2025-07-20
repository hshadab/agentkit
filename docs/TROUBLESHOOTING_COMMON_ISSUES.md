# Troubleshooting Common Issues

This document covers common issues and their solutions to prevent recurring problems.

## Table of Contents
1. [Transfer Polling Issues](#transfer-polling-issues)
2. [Proof Cards Not Showing](#proof-cards-not-showing)
3. [Solana Wallet Connection in Workflows](#solana-wallet-connection-in-workflows)
4. [Circle Transfer Status](#circle-transfer-status)

## Transfer Polling Issues

### Problem
Transfers show as "pending" indefinitely and blockchain links don't appear even when transfers are complete.

### Root Cause
Circle API returns transaction hashes in different field names depending on the blockchain and API version:
- `transactionHash`
- `txHash`
- `blockchainLocation.txHash`
- `transactionId` (Solana)
- `transactionDetails.transactionHash`

### Solution
The system now checks all possible field names when polling transfer status. The polling automatically stops when a transfer reaches "complete" or "failed" status.

### Implementation Details
- **Backend** (`chat_service.py`): Enhanced transaction hash extraction in `poll_transfer` endpoint
- **Frontend** (`transfer-manager.js`): Updated to handle both `blockchainTxHash` and `transactionHash` fields
- **Explorer Links** (`utils.js`): Automatically generates blockchain explorer links when transaction hash is available

## Proof Cards Not Showing

### Problem
Standalone proof generation doesn't show proof cards in the UI, making it appear as if nothing is happening.

### Root Cause
The system was incorrectly identifying all proofs with a `workflowId` field as workflow proofs, even when they were standalone operations.

### Solution
Implemented proper workflow tracking:
1. Only proofs that are part of an **active** workflow are hidden
2. Workflow states are tracked in `workflowManager.workflowStates`
3. Even single-step workflows are tracked to maintain consistency

### Implementation Details
```javascript
// Check if proof is part of an active workflow
const activeWorkflowId = data.workflowId || data.workflow_id || 
                        data.additional_context?.workflow_id;
const isPartOfWorkflow = activeWorkflowId && workflowManager.workflowStates.has(activeWorkflowId);

// Only show proof card for standalone proofs
if (!isPartOfWorkflow) {
    // Show proof card
}
```

## Solana Wallet Connection in Workflows

### Problem
Solana verification fails in workflows with "Failed to connect to Solana wallet" error, and users don't see the Solflare transaction approval popup.

### Root Cause
When workflows trigger Solana verification, the wallet might not be connected yet, and the verification attempts to proceed without establishing a connection first.

### Solution
Added automatic wallet connection before Solana verification:
1. Check if Solana wallet is connected before verification
2. If not connected, attempt to connect (triggers Solflare popup)
3. Wait 500ms after connection to ensure wallet is ready
4. Then proceed with verification

### Implementation Details
```javascript
// In blockchain_verification_request handler
if (data.blockchain?.toUpperCase() === 'SOLANA' && !blockchainVerifier.solanaConnected) {
    debugLog('Solana wallet not connected, attempting connection...', 'info');
    const connected = await blockchainVerifier.connectSolana();
    if (!connected) {
        throw new Error('Failed to connect Solana wallet. Please ensure Solflare is installed and unlocked.');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
}
```

### Wallet Requirements
- **Recommended**: Solflare wallet (best compatibility)
- **Alternative**: Phantom or Backpack wallets
- Wallet must be unlocked and user must approve connection when prompted

## Circle Transfer Status

### Problem
Understanding Circle transfer flow and status updates.

### Circle Transfer Flow
1. **USD → USDC Conversion**: Circle automatically converts USD to USDC during transfer
2. **Status Progression**: `pending` → `complete`
3. **Transaction Hash**: Available once blockchain confirmation occurs

### Common Issues
1. **"insufficient_funds" error**: Check USD balance (not USDC) in Circle wallets
2. **No confirmation emails**: Normal for sandbox environment
3. **Pending status**: Transfers typically complete in 30-60 seconds

### Debugging Commands
```bash
# Check wallet balances
node circle/check-usdc-balances.js

# Check recent transfers
node circle/check-transfers.js

# Check specific transfer
node circle/check-transfer-status.js <transfer-id>
```

## Prevention Strategies

### 1. Always Test Wallet Connections First
Before running workflows with blockchain verification:
- Manually connect wallets through the UI
- Verify wallet is unlocked
- Test with a simple proof verification first

### 2. Monitor Console Logs
Enable debug mode and watch for:
- WebSocket messages
- Wallet connection status
- Transfer polling updates
- Error messages

### 3. Check Network Status
Ensure you're on the correct networks:
- **Ethereum**: Sepolia testnet
- **Solana**: Devnet
- **Base**: Base Sepolia

### 4. Verify Environment Variables
Critical variables in `.env`:
```env
CIRCLE_API_KEY=your_api_key
CIRCLE_ETH_WALLET_ID=your_eth_wallet_id
CIRCLE_SOL_WALLET_ID=your_sol_wallet_id
```

## Getting Help

If issues persist:
1. Check browser console for detailed error messages
2. Review WebSocket messages in Network tab
3. Check backend logs for API responses
4. Create an issue on GitHub with:
   - Error messages
   - Steps to reproduce
   - Browser/wallet versions
   - Relevant logs