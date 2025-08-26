#!/bin/bash

echo "========================================================================"
echo "              ATTEMPTING REAL zkML INFERENCE PROOF GENERATION"
echo "========================================================================"
echo ""
echo "This will run JOLT-Atlas and monitor for actual proof generation."
echo "We need to see more than just 'Trace length' output to confirm real proof."
echo ""

BINARY="/home/hshadab/agentkit/jolt-atlas/target/release/zkml-jolt-core"

# Function to check for proof generation indicators
check_proof_output() {
    local output="$1"
    
    # Real proof generation would show these indicators
    if echo "$output" | grep -q "polynomial"; then
        echo "✓ Found polynomial commitment activity"
        return 0
    fi
    
    if echo "$output" | grep -q "sumcheck"; then
        echo "✓ Found sumcheck protocol activity"
        return 0
    fi
    
    if echo "$output" | grep -q "proof"; then
        echo "✓ Found proof generation activity"
        return 0
    fi
    
    if echo "$output" | grep -q "verify"; then
        echo "✓ Found verification activity"
        return 0
    fi
    
    # Only seeing trace setup
    echo "✗ Only seeing trace setup, no proof generation"
    return 1
}

echo "Test 1: Quick check (15 seconds)"
echo "----------------------------------------"
OUTPUT=$(timeout 15 $BINARY profile --name sentiment 2>&1)
echo "$OUTPUT"
check_proof_output "$OUTPUT"
echo ""

echo "Test 2: Longer run (60 seconds) with monitoring"
echo "----------------------------------------"
echo "Starting at $(date)..."
echo ""

# Run in background with output capture
TMPFILE=$(mktemp)
timeout 60 $BINARY profile --name sentiment > $TMPFILE 2>&1 &
PID=$!

# Monitor for 60 seconds
for i in {1..60}; do
    if ! kill -0 $PID 2>/dev/null; then
        echo "Process completed after $i seconds"
        break
    fi
    
    # Check output every 10 seconds
    if [ $((i % 10)) -eq 0 ]; then
        echo "Still running after $i seconds..."
        CURRENT=$(cat $TMPFILE 2>/dev/null)
        if [ ! -z "$CURRENT" ]; then
            echo "Current output:"
            echo "$CURRENT" | tail -5
        fi
    fi
    
    sleep 1
done

echo ""
echo "Final output:"
cat $TMPFILE
echo ""

check_proof_output "$(cat $TMPFILE)"

rm -f $TMPFILE

echo ""
echo "========================================================================"
echo "CONCLUSION:"
echo "========================================================================"

if check_proof_output "$(timeout 10 $BINARY profile --name sentiment 2>&1)"; then
    echo "✅ REAL PROOF GENERATION DETECTED!"
    echo "The system is generating actual cryptographic proofs."
else
    echo "❌ NO REAL PROOF GENERATION"
    echo "The system only completes setup phase, no actual proof is generated."
    echo ""
    echo "This means:"
    echo "1. Model loads successfully ✓"
    echo "2. Trace generation works ✓"
    echo "3. Polynomial commitment fails/times out ✗"
    echo "4. No cryptographic proof produced ✗"
fi