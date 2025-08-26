# Local Verification Test Guide

This guide will help you test local verification for all three proof types through the UI.

## Test Steps

### 1. KYC Proof Test
1. In the UI, send: `Generate KYC proof`
2. Wait for the proof to complete (shows green checkmark)
3. Click the "✓ Verify Locally" button on the proof card
4. Expected result: Button should change to "✅ Verified" and show success

### 2. Location Proof Test
1. In the UI, send: `Prove location: NYC (40.7, -74.0)`
2. Wait for the proof to complete
3. Click the "✓ Verify Locally" button on the proof card
4. Expected result: Button should change to "✅ Verified" and show success

### 3. AI Content Proof Test
1. In the UI, send: `Prove AI content authenticity`
2. Wait for the proof to complete
3. Click the "✓ Verify Locally" button on the proof card
4. Expected result: Button should change to "✅ Verified" and show success

## What Success Looks Like

For each proof type, after clicking "Verify Locally":
- The button text changes to "✅ Verified" with green background
- A verification result card appears showing:
  - "Local Verification Result" 
  - Status badge showing "VALID"
  - Proof ID
  - Details about the verification

## Troubleshooting

If verification fails:
- Check the browser console for errors
- Ensure the Rust server is running on port 8001
- Check that the proof was properly generated before attempting verification

## Summary

All three proof types should support local verification:
- ✅ KYC Proof (`prove_kyc`)
- ✅ Location Proof (`prove_location`) 
- ✅ AI Content Proof (`prove_ai_content`)

Each uses the same verification endpoint but validates different proof structures.