#!/bin/bash

# Test the Ethereum proof export endpoint with a recent proof

PROOF_ID="proof_location_1752279279695"
echo "Testing Ethereum proof export for: $PROOF_ID"
echo "----------------------------------------"

# Make the request
curl -s "http://localhost:8001/api/proof/$PROOF_ID/ethereum" | jq '.'

echo -e "\n\nChecking if proof directory exists:"
ls -la "/home/hshadab/agentkit/proofs/$PROOF_ID/"