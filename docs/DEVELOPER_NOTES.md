# Developer Notes

Technical implementation details and architectural decisions for maintainers.

## Workflow vs Standalone Proof Detection

### The Problem
The system needs to differentiate between:
1. **Standalone proofs**: Show proof cards in UI
2. **Workflow proofs**: Hide individual proof cards (shown in workflow card instead)

### Implementation
```javascript
// workflowManager.workflowStates tracks all active workflows
const activeWorkflowId = data.workflowId || data.workflow_id || 
                        data.additional_context?.workflow_id;
const isPartOfWorkflow = activeWorkflowId && workflowManager.workflowStates.has(activeWorkflowId);
```

### Key Points
- Workflows are added to `workflowStates` when `workflow_started` event is received
- Even single-step workflows are tracked to maintain consistency
- Workflow states are cleaned up 1 second after completion/failure
- Presence of `workflowId` alone doesn't make it a workflow proof

## Transfer Polling Architecture

### WebSocket Flow
1. Frontend initiates polling via `transferManager.startTransferPolling()`
2. Sends `poll_transfer` message to Rust backend via WebSocket
3. Rust backend calls Python `/poll_transfer` endpoint
4. Python executes `circle/check-transfer-status.js`
5. Response flows back through the chain to UI

### Field Name Handling
Circle API returns transaction hashes in various fields:
- Primary: `transactionHash`
- Alternative: `txHash`, `blockchainLocation.txHash`
- Solana-specific: `transactionId`, `blockchainTxId`, `solanaSignature`
- Nested: `transactionDetails.transactionHash`

### Polling Lifecycle
- Starts: When transfer is initiated
- Frequency: Every 5 seconds (configurable in `config.js`)
- Stops: When status is "complete" or "failed"
- Max duration: 5 minutes (prevents infinite polling)

## Solana Wallet Connection Strategy

### Auto-Connection in Workflows
```javascript
// Before Solana verification in workflows
if (data.blockchain?.toUpperCase() === 'SOLANA' && !blockchainVerifier.solanaConnected) {
    const connected = await blockchainVerifier.connectSolana();
    if (!connected) {
        throw new Error('Failed to connect Solana wallet');
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // Wallet readiness delay
}
```

### Wallet Priority
1. Solflare (recommended - best compatibility)
2. Phantom
3. Backpack
4. Generic Solana provider

### Connection State Management
- `blockchainVerifier.solanaConnected`: Tracks connection status
- `blockchainVerifier.solanaWallet`: Stores public key
- `blockchainVerifier.connectedWallet`: Stores provider reference

## Message Type Handling

### Proof Status Messages
The system handles multiple message types for backwards compatibility:
- `proof_generation_started`
- `proof_started` (alternative)
- `proof_status` (primary)
- `proof_generation_complete`
- `proof_complete` (alternative)

### Field Name Flexibility
Many messages support both camelCase and snake_case:
- `workflowId` / `workflow_id`
- `stepId` / `step_id`
- `proofId` / `proof_id`

## State Management

### Workflow States
- Stored in: `workflowManager.workflowStates` (Map)
- Created: On `workflow_started` event
- Updated: Via `updateWorkflowStep()` and `updateWorkflowStatus()`
- Cleaned: 1 second after completion/failure

### Transfer States
- Stored in: `transferManager.transferStates` (Map)
- Created: When polling starts
- Updated: On each poll response
- Used for: Merging partial updates, tracking status

### Proof Verifications
- Stored in: `proofManager.onChainVerifications` (Map)
- Key: Proof ID
- Value: { blockchain, txHash, explorerUrl, timestamp }

## Error Handling Patterns

### Wallet Connection Errors
```javascript
try {
    const resp = await wallet.connect();
} catch (error) {
    if (error.code === 4001) {
        // User rejected - show friendly message
    } else {
        // Technical error - log details
    }
}
```

### Transfer Polling Errors
- Network errors: Continue polling (transient)
- API errors: Log and continue
- Invalid transfer ID: Stop polling

### Verification Errors
- "Already verified": Success (idempotent)
- Network errors: Retry with user action
- Wallet errors: Guide user to fix

## Performance Considerations

### Polling Optimization
- Use WebSocket for real-time updates (not HTTP polling)
- Batch status checks when possible
- Stop polling promptly on completion

### UI Updates
- Use data attributes for efficient DOM queries
- Update only changed elements
- Debounce rapid state changes

### Memory Management
- Clean up completed workflow states
- Clear polling intervals on completion
- Remove old WebSocket listeners

## Testing Strategies

### Manual Testing Checklist
1. **Standalone Proof**: Should show proof card
2. **Simple Workflow**: Should show workflow card
3. **Solana Verification**: Should prompt for wallet connection
4. **Transfer Completion**: Should show blockchain link
5. **Error Cases**: Should show appropriate messages

### Common Test Scenarios
```bash
# Standalone proof
"Generate a KYC proof"

# Workflow with verification
"Generate KYC proof and verify on Solana"

# Complex workflow
"Generate KYC proof for Alice, verify on Solana, then transfer 0.05 USDC"

# Multi-chain workflow
"Verify Bob's KYC on Ethereum and send 0.03 USDC, verify Alice's KYC on Solana and send 0.05 USDC"
```

## Future Improvements

### Planned Enhancements
1. Batch transfer status polling
2. Reconnection handling for WebSocket
3. Offline queue for pending operations
4. Progressive enhancement for slow connections

### Technical Debt
1. Consolidate message type handling
2. Standardize field naming (camelCase vs snake_case)
3. Extract magic numbers to configuration
4. Add comprehensive error recovery

## Code Organization

### Module Responsibilities
- `main.js`: WebSocket message routing and coordination
- `workflow-manager.js`: Workflow UI and state management
- `transfer-manager.js`: Transfer polling and UI updates
- `blockchain-verifier.js`: Wallet connections and chain interactions
- `proof-manager.js`: Proof card UI and verification tracking

### Event Flow
1. User action → UI Manager
2. UI Manager → WebSocket Manager
3. WebSocket → Rust Backend
4. Rust Backend → Python Service
5. Python Service → External APIs
6. Response flows back in reverse

## Debugging Tips

### Console Commands
```javascript
// Check workflow states
workflowManager.workflowStates

// Check transfer polling
transferManager.transferPollingIntervals

// Check wallet connection
blockchainVerifier.solanaConnected

// Force WebSocket reconnect
wsManager.reconnect()
```

### Common Issues
1. **Proof cards not showing**: Check `workflowManager.workflowStates`
2. **Transfer stuck**: Check Network tab for `poll_transfer` messages
3. **Wallet issues**: Check `window.solflare` availability
4. **WebSocket errors**: Check connection status in Network tab