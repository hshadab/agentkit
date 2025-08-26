# Testing Solana Commitment Verification

## Prerequisites
- ✅ Deployed Solana program to devnet
- ✅ Updated Program ID in `solana-verifier.js`
- ✅ Solflare wallet connected to devnet
- ✅ zkEngine server running

## Testing Steps

### 1. Start the Server
```bash
cargo run --release
```

### 2. Open the UI
Navigate to: http://localhost:8001

### 3. Test Each Proof Type

#### Test 1: KYC Proof
1. Type in chat: `prove kyc for alice@example.com`
2. Wait for proof generation (~12-14 seconds)
3. Click **"Verify on Solana"** button
4. Approve transaction in Solflare
5. Check the transaction link

#### Test 2: Location Proof  
1. Type in chat: `prove location 40.7128,-74.0060 for device123`
2. Wait for proof generation
3. Click **"Verify on Solana"** button
4. Approve transaction in Solflare
5. Check the transaction link

#### Test 3: AI Content Proof
1. Type in chat: `verify ai content "AI safety research paper" with hash abc123 score 0.95`
2. Wait for proof generation
3. Click **"Verify on Solana"** button
4. Approve transaction in Solflare
5. Check the transaction link

### 4. Verify Transaction Details

For each transaction:
1. Click the Solana Explorer link
2. Check "Program Logs" section
3. Look for:
   - `zkEngine Commitment Verifier v1.0`
   - `Verifying [TYPE] proof commitment`
   - `✅ Commitment VALID`
   - `Verifier: [YOUR_WALLET]`

### 5. What Success Looks Like

✅ **Successful verification shows:**
- Green "Verified on Solana" status
- Transaction signature link
- Program logs showing commitment validation
- Your wallet address as verifier

❌ **If verification fails:**
- Check console for errors
- Ensure wallet is on devnet
- Verify program ID is correct
- Check you have SOL balance

## Debugging Commands

```bash
# Check program is deployed
solana program show YOUR_PROGRAM_ID --url devnet

# Check wallet balance
solana balance A6mKVjHuha3UUcPYKH2YWW7yXBd5Zs1SUwtqmJgY44pL --url devnet

# Get more devnet SOL
solana airdrop 2 A6mKVjHuha3UUcPYKH2YWW7yXBd5Zs1SUwtqmJgY44pL --url devnet

# View recent transactions
solana transaction-history A6mKVjHuha3UUcPYKH2YWW7yXBd5Zs1SUwtqmJgY44pL --url devnet --limit 5
```

## Expected Console Output

When clicking "Verify on Solana":
```
=== SOLANA VERIFICATION START ===
Proof ID: abc123...
Proof Type: kyc
Fetching proof data for Solana verification: abc123...
Proof data received: {commitment: "0x1234...", ...}
Sending verification transaction...
Solana verification transaction confirmed: 3xYz9...
Program logs: ["Program ABC123... invoke [1]", "zkEngine Commitment Verifier v1.0", ...]
```

## Common Issues

1. **"No Solana wallet found"**
   - Install/enable Solflare extension
   - Refresh the page

2. **"Transaction simulation failed"**
   - Wrong program ID
   - Insufficient SOL balance
   - Program not deployed

3. **"Invalid commitment"**
   - Proof data corrupted
   - Backend endpoint issue

## Success Metrics

After testing all 3 proofs:
- ✅ 3 successful on-chain transactions
- ✅ Each shows commitment verification in logs
- ✅ UI shows green verification status
- ✅ Explorer links work

Your Solana commitment verification is now fully operational! 🎉