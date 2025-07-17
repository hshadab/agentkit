#!/bin/bash

echo "Testing Ethereum proof endpoint..."

# First, check if the server is running
echo "1. Checking server health..."
curl -s http://localhost:8001/test || echo "Server not responding"

# Create a test proof directory structure
PROOF_ID="test-$(date +%s)"
PROOF_DIR="./proofs/$PROOF_ID"
echo -e "\n2. Creating test proof at $PROOF_DIR..."
mkdir -p "$PROOF_DIR"

# Create a sample public.json
cat > "$PROOF_DIR/public.json" << EOF
{
  "inputs": [1, 2, 3],
  "outputs": [4, 5, 6],
  "timestamp": $(date +%s)
}
EOF

# Create a sample metadata.json
cat > "$PROOF_DIR/metadata.json" << EOF
{
  "function": "prove_kyc",
  "arguments": ["Alice", "30"],
  "step_size": 50,
  "proof_type": "kyc"
}
EOF

# Create a dummy nova_proof.json
cat > "$PROOF_DIR/nova_proof.json" << EOF
{
  "proof": "dummy_proof_data",
  "public_inputs": [1, 2, 3],
  "verification_result": true
}
EOF

echo "3. Test proof created with ID: $PROOF_ID"

# Test the ethereum endpoint
echo -e "\n4. Testing /api/proof/$PROOF_ID/ethereum endpoint..."
RESPONSE=$(curl -s -w "\n\nHTTP_STATUS:%{http_code}" http://localhost:8001/api/proof/$PROOF_ID/ethereum)
echo "$RESPONSE" | grep -v "HTTP_STATUS"
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

echo -e "\nHTTP Status Code: $HTTP_STATUS"

# Clean up
echo -e "\n5. Cleaning up test proof..."
rm -rf "$PROOF_DIR"

echo -e "\nTest complete."