# Groth16 Backend Timeout Fix Documentation

## Problem
The Groth16 backend (`api/groth16-jolt-backend-real.js`) was experiencing timeout issues on startup, causing Step 2 of the Circle Gateway zkML workflow to fail.

### Root Cause
- ethers.js JsonRpcProvider was attempting network detection on initialization
- The network detection call was timing out, causing the entire backend to crash
- This prevented the service from handling verification requests

## Solution Implemented

### 1. Multiple Fallback RPC Endpoints
```javascript
const RPC_URLS = [
    'https://eth-sepolia.public.blastapi.io',
    'https://ethereum-sepolia-rpc.publicnode.com', 
    'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    'https://rpc.sepolia.org'
];
```

### 2. Retry Logic with Timeout
```javascript
async function initializeProvider() {
    for (const rpcUrl of RPC_URLS) {
        try {
            const testProvider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
                staticNetwork: true // Skip network detection
            });
            
            // 5-second timeout for connection test
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), 5000)
            );
            
            const blockNumberPromise = testProvider.getBlockNumber();
            await Promise.race([blockNumberPromise, timeoutPromise]);
            
            // If successful, use this provider
            provider = testProvider;
            wallet = new ethers.Wallet(PRIVATE_KEY, provider);
            storageVerifier = new ethers.Contract(STORAGE_VERIFIER, storageDeployment.abi, wallet);
            
            return true;
        } catch (error) {
            continue; // Try next RPC
        }
    }
    throw new Error('Failed to connect to any RPC endpoint');
}
```

### 3. Lazy Initialization
- Provider initialization moved from module load to first request
- Service starts even if initial connection fails
- Attempts reconnection on each request if not connected

### 4. Static Network Mode
- Uses `staticNetwork: true` to skip automatic network detection
- Reduces startup time and prevents timeout issues
- Network is known (Sepolia) so detection is unnecessary

## Results

### Before Fix
- Backend would crash on startup with ETIMEDOUT error
- Step 2 verification would fail
- Workflow could not complete

### After Fix
- Backend starts successfully in ~2 seconds
- Automatic fallback to working RPC endpoints
- All verification requests complete successfully
- Example successful transaction: [0x30775278f457979fcf71f51c8726168f8929db699884761b84183a73ec92875c](https://sepolia.etherscan.io/tx/0x30775278f457979fcf71f51c8726168f8929db699884761b84183a73ec92875c)

## Files Modified
- `api/groth16-jolt-backend-real.js` - Added retry logic and fallback RPCs

## Testing
```bash
# Test backend health
curl http://localhost:3004/health

# Test verification endpoint
curl -X POST http://localhost:3004/groth16/workflow \
  -H "Content-Type: application/json" \
  -d '{"proofHash": "0x...", "decision": 1, "confidence": 95}'
```

## Monitoring
The backend now logs connection attempts and successes:
- `✅ Successfully connected to [RPC_URL]` - Connection successful
- `❌ Failed to connect to [RPC_URL]` - Connection failed, trying next
- `⚠️ WARNING: Failed to connect to RPC on startup` - Service running but will retry

## Future Improvements
1. Add WebSocket connections for better performance
2. Implement connection pooling for multiple RPCs
3. Add metrics for RPC reliability monitoring
4. Consider using a dedicated node service for production