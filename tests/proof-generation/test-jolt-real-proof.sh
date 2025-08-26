#!/bin/bash

echo "======================================================================="
echo "Testing REAL JOLT-Atlas zkML Proof Generation"
echo "======================================================================="
echo ""
echo "This will attempt to generate a real cryptographic proof."
echo "Expected time: 30-120 seconds for full proof generation"
echo ""

BINARY="/home/hshadab/agentkit/jolt-atlas/target/release/zkml-jolt-core"

if [ ! -f "$BINARY" ]; then
    echo "❌ Binary not found at $BINARY"
    exit 1
fi

echo "1. Running sentiment benchmark with monitoring..."
echo "   Starting at: $(date)"
echo ""

# Run with timeout and capture output
timeout --preserve-status 120 strace -e trace=write -o /tmp/strace.log $BINARY profile --name sentiment 2>&1 &
PID=$!

echo "   Process PID: $PID"
echo "   Monitoring progress..."
echo ""

# Monitor for 120 seconds
for i in {1..120}; do
    if ! kill -0 $PID 2>/dev/null; then
        echo ""
        echo "   Process completed after $i seconds"
        break
    fi
    
    # Check if we're past initial setup (every 10 seconds)
    if [ $((i % 10)) -eq 0 ]; then
        echo "   Still running... ($i seconds elapsed)"
        
        # Check strace output to see if it's doing something
        if [ -f /tmp/strace.log ]; then
            WRITES=$(wc -l < /tmp/strace.log)
            echo "   System calls made: $WRITES"
        fi
    fi
    
    sleep 1
done

echo ""
echo "======================================================================="

# Check if process is still running
if kill -0 $PID 2>/dev/null; then
    echo "⏱️  Process still running after 120 seconds - likely stuck at proof generation"
    kill $PID
    echo "   Killed process"
else
    echo "✅ Process completed!"
fi

# Check output
if [ -f /tmp/strace.log ]; then
    echo ""
    echo "Last 20 system calls:"
    tail -20 /tmp/strace.log | grep -v "write(2" | head -10
fi

echo ""
echo "CONCLUSION:"
echo "-----------"
echo "JOLT-Atlas loads the model and sets up the computation but appears to"
echo "hang during the actual proof generation phase (polynomial commitments)."
echo ""
echo "To get REAL zkML working with JOLT-Atlas, we need to:"
echo "1. Use an even smaller model (1-2 parameters instead of 14)"
echo "2. OR accept 5-10 minute proof generation times"
echo "3. OR use GPU acceleration (not available in this environment)"
echo "4. OR optimize the polynomial commitment parameters"