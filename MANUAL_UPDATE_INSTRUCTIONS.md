# Manual Update Instructions for GitHub

Since the direct push is timing out due to repository size, here are the key files that need to be updated:

## Option 1: Essential Files Package
I've prepared the essential files. You can:

1. Clone your GitHub repository fresh on another machine:
```bash
git clone https://github.com/hshadab/agentkit.git agentkit-fresh
cd agentkit-fresh
```

2. Copy these updated files from your local repository:
```bash
# Core fixes
cp /home/hshadab/agentkit/static/js/ui/gateway-workflow-manager-v2.js static/js/ui/
cp /home/hshadab/agentkit/static/js/main.js static/js/
cp /home/hshadab/agentkit/static/index.html static/
cp /home/hshadab/agentkit/static/gateway-deposit-fixed.html static/

# New backend
cp /home/hshadab/agentkit/api/unified-backend.js api/

# Documentation
cp /home/hshadab/agentkit/README.md .
cp /home/hshadab/agentkit/docs/GATEWAY_SIGNATURE_FIX_2025.md docs/

# Utilities
cp /home/hshadab/agentkit/force-cache-clear.sh .
```

3. Commit and push from the fresh clone:
```bash
git add -A
git commit -m "fix: Complete Circle Gateway signature resolution and zkML integration"
git push origin main
```

## Option 2: Create Fresh Repository
1. Create a new repository on GitHub (can be temporary)
2. Copy only source code (no build artifacts):
```bash
rsync -av --exclude='.git' --exclude='node_modules' --exclude='target' \
  --exclude='*.ptau' --exclude='jolt-atlas/target' \
  /home/hshadab/agentkit/ ./agentkit-clean/
```
3. Push to new repo, then update original

## Key Changes Made (Aug 25, 2025):

### Fixed Files:
- `static/js/ui/gateway-workflow-manager-v2.js` - Fixed signature format
- `static/js/main.js` - Added programmatic signing key
- `static/gateway-deposit-fixed.html` - Proper deposit page
- `api/unified-backend.js` - Unified service on port 8002

### What Was Fixed:
1. ✅ Signature format: raw hex string (not r,s,v)
2. ✅ Domain: `{ name: "GatewayWallet", version: "1" }`
3. ✅ Types: Added EIP712Domain for ethers.js
4. ✅ Fees: 2.000001 USDC minimum
5. ✅ Deposit: Using GatewayWallet.deposit() function

## Verification:
After updating, test at http://localhost:8080/
- zkML proof generation should work
- Gateway transfers should not show signature errors
- Use `/gateway-deposit-fixed.html` to add USDC balance