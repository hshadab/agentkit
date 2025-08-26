#!/bin/bash
echo "🚀 Starting IoT Workflow Test"
echo "=============================="

# Kill any existing responders
pkill -f workflow_responder.js 2>/dev/null

# Start responder
echo "Starting workflow responder..."
node workflow_responder.js > responder_test.log 2>&1 &
RESPONDER_PID=$!
sleep 2

# Run workflow
echo "Running workflow..."
cd circle
timeout 45 node ../parsers/workflow/workflowCLI.js --parsed-file ./parsed_workflow_wf_1753666325.json > workflow_test.log 2>&1 &
WORKFLOW_PID=$!

# Monitor for 40 seconds
echo "Monitoring workflow progress..."
for i in {1..40}; do
    if grep -q "workflow_completed" workflow_test.log 2>/dev/null; then
        echo "✅ Workflow completed!"
        break
    fi
    if grep -q "iotex_verification_response" ../responder_test.log 2>/dev/null; then
        echo "✅ IoTeX verification response sent"
    fi
    sleep 1
done

echo ""
echo "=== Workflow Status ==="
grep -E "step_[0-9].*completed|failed|Error:" workflow_test.log 2>/dev/null || echo "No step completions found"

echo ""
echo "=== Responder Activity ==="
grep -E "Received:|Sending" ../responder_test.log 2>/dev/null | tail -10

# Cleanup
kill $RESPONDER_PID 2>/dev/null
kill $WORKFLOW_PID 2>/dev/null

echo ""
echo "Test complete. Check workflow_test.log and responder_test.log for details."