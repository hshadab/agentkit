# Circle Integration Troubleshooting

## Common Misconceptions

### ❌ WRONG: "I need USDC in my Circle wallets"
### ✅ RIGHT: "I need USD in my Circle wallets"

Circle automatically converts USD to USDC when transferring to blockchain addresses. This is how it's designed to work.

## Frequently Asked Questions

### Q: My wallet shows 0 USDC. Is this a problem?
**A: No!** Your Circle wallets should have USD, not USDC. When you check balances:
```
Ethereum Wallet: $7.75 USD ✅ (This is correct)
Solana Wallet: $7.85 USD ✅ (This is correct)
```

### Q: How do I add USDC to my wallets?
**A: You don't.** Add USD instead:
1. Go to https://app-sandbox.circle.com/
2. Navigate to your wallet
3. Add USD funds (test money in sandbox)
4. The system converts USD → USDC automatically during transfers

### Q: What are my wallet addresses?
**A: Circle wallets don't have blockchain addresses.** They use internal IDs:
- Ethereum operations: Wallet ID `1017342606`
- Solana operations: Wallet ID `1017342622`

These are custodial wallets. Circle manages the actual blockchain addresses internally.

### Q: Why are my transfers "pending"?
**A: This is normal.** Circle transfers typically take:
- Ethereum: 30 seconds to 2 minutes
- Solana: 1-3 minutes (sometimes longer)

Check status with: `node circle/check-transfers.js`

### Q: I see "insufficient_funds" error
**A: Check your USD balance** (not USDC):
```bash
node circle/check-usdc-balances.js
```
You need enough USD to cover the transfer amount.

## How Transfers Actually Work

### Step 1: Your Code
```javascript
// Transfer 0.05 "USDC" to alice on Ethereum
circleHandler.transfer('0.05', 'alice', 'ETH')
```

### Step 2: What Circle Does
1. Deducts 0.05 USD from wallet `1017342606`
2. Converts 0.05 USD → 0.05 USDC
3. Sends 0.05 USDC to alice's Ethereum address
4. Returns transfer ID and transaction hash

### Step 3: Result
- Your wallet: -0.05 USD
- Alice's address: +0.05 USDC
- Blockchain: Transaction recorded

## Debugging Checklist

1. **Check USD Balance**
   ```bash
   node circle/check-wallet-balance.js
   ```

2. **Check Recent Transfers**
   ```bash
   node circle/check-transfers.js
   ```

3. **Test Small Transfer**
   ```bash
   node circle/test-transfer.js
   ```

4. **View in Circle Dashboard**
   - Go to https://app-sandbox.circle.com/
   - Check Transfers section
   - Look for error messages

## Still Having Issues?

1. **Verify Configuration**
   ```bash
   python3 check_circle_setup.py
   ```

2. **Check Logs**
   - Backend logs show Circle API responses
   - Frontend console shows WebSocket messages

3. **Common Solutions**
   - Ensure you have USD balance (not USDC)
   - Wait for pending transfers to complete
   - Check Circle dashboard for account issues
   - Verify API key is valid and not expired

## Contact Support

- Circle Developer Support: https://developers.circle.com/
- GitHub Issues: https://github.com/ICME-Lab/verifiable-agent-kit/issues
- Documentation: See [Circle Integration Guide](CIRCLE_INTEGRATION_GUIDE.md)