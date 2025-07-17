#!/bin/bash
# Test real SNARK generation with the new 180-second timeout

echo "=== Testing Real SNARK Generation ==="
echo "This will test if SNARK generation completes within 180 seconds"
echo ""

# Create a test input file
cat > /tmp/test_snark_input.json << EOF
{
    "proofId": "test_proof_$(date +%s)",
    "metadata": {
        "function": "prove_kyc",
        "proofType": "kyc"
    },
    "commitment": "0x1234567890abcdef",
    "publicInputs": {
        "commitment": "0x1234567890abcdef",
        "proof_type": "1",
        "timestamp": "$(date +%s)"
    }
}
EOF

echo "Test input created at /tmp/test_snark_input.json"
echo ""
echo "Running SNARK generation with 180s timeout..."
echo "Start time: $(date)"

# Run the wrapper script directly
time bash src/snark_wrapper.sh /tmp/test_snark_input.json

EXIT_CODE=$?
echo ""
echo "End time: $(date)"
echo "Exit code: $EXIT_CODE"

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ SNARK generation succeeded!"
else
    echo "❌ SNARK generation failed"
    echo "Error log:"
    cat /tmp/snark_error.log 2>/dev/null || echo "No error log found"
fi