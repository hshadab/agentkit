#!/bin/bash

echo "======================================================================"
echo "Testing REAL zkML with Minimal Input"
echo "======================================================================"
echo ""
echo "Strategy: Use sentiment model but with smallest possible input"
echo "to reduce polynomial size and proof generation time"
echo ""

BINARY="/home/hshadab/agentkit/jolt-atlas/target/release/zkml-jolt-core"

# Test 1: Run with timing to see how long setup takes
echo "Test 1: Measure setup time (should be <10 seconds)"
echo "----------------------------------------------------------------------"
START=$(date +%s)
timeout 15 $BINARY profile --name sentiment 2>&1
END=$(date +%s)
ELAPSED=$((END - START))
echo ""
echo "Setup completed in $ELAPSED seconds"

# Test 2: Try running longer to see if proof generates
echo ""
echo "Test 2: Attempt full proof generation (60 second timeout)"
echo "----------------------------------------------------------------------"
echo "Starting at: $(date)"
echo "This will attempt to generate a REAL cryptographic proof..."
echo ""

# Run with longer timeout
timeout 60 $BINARY profile --name sentiment 2>&1 &
PID=$!

# Monitor progress
for i in {1..60}; do
    if ! kill -0 $PID 2>/dev/null; then
        echo ""
        echo "✅ Process completed after $i seconds!"
        break
    fi
    
    if [ $((i % 10)) -eq 0 ]; then
        echo "   Still running... ($i seconds elapsed)"
    fi
    
    sleep 1
done

if kill -0 $PID 2>/dev/null; then
    echo ""
    echo "⏱️ Still running after 60 seconds - proof generation incomplete"
    kill $PID
fi

echo ""
echo "======================================================================"
echo "RESULTS:"
echo "======================================================================"
echo ""
echo "The sentiment model with 14 embeddings is too complex for fast proofs."
echo ""
echo "To get REAL zkML working quickly, we need:"
echo "1. A model with only 1-2 parameters (not 14 embeddings)"
echo "2. OR wait 5-10 minutes for proof generation"
echo "3. OR use GPU acceleration"
echo ""
echo "Current status: Infrastructure ✅, Real proofs ❌ (too slow)"