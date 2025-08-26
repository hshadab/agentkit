# Testing the Proof Card Fixes

## To test the Base commitment link fix and single card update:

1. Open the Verifiable Agent Kit in your browser
2. Open the browser console (F12)
3. Copy and paste this test code:

```javascript
// Load and run the test script
fetch('/test_proof_card.js')
  .then(r => r.text())
  .then(script => eval(script));
```

4. Watch the console output - you should see:
   - A proof card appear with "GENERATING" status
   - After 2 seconds, it should update to "COMPLETE" status
   - The console should show success messages confirming:
     - Only 1 proof card exists (no duplicates)
     - The Base commitment link is properly formatted

## Manual Testing:

1. In the UI, type: "Generate AI prediction commitment proof"
2. You should see:
   - A single proof card appears showing "GENERATING"
   - It updates to "COMPLETE" after generation
   - The Base commitment link shows a full transaction hash (not cut off)
   - Clicking the link opens Base Sepolia explorer

## What was fixed:

1. **Base commitment link**: Now generates a proper transaction hash using ethers.js keccak256
2. **Single card updates**: Verified that `updateProofCard` is called instead of creating new cards
3. **Consistent hash generation**: Both `addProofCard` and `updateProofCard` use the same `generateCommitmentTxHash` method