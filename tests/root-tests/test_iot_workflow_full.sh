#!/bin/bash
echo "Starting full IoT workflow test..."

# Kill any existing mock UI
pkill -f mock_ui_responder 2>/dev/null

# Start mock UI in background with output to file
node mock_ui_responder.js > /tmp/mock_ui_full.log 2>&1 &
MOCK_PID=$!
echo "Mock UI started with PID: $MOCK_PID"

sleep 2

# Run the workflow with 90 second timeout
echo "Executing IoT workflow (90 second timeout)..."
time curl -s -X POST http://localhost:8002/execute_workflow \
  -H "Content-Type: application/json" \
  -d '{"command": "Register IoT device TEST123 with proximity proof"}' \
  --max-time 90 > /tmp/iot_workflow_full.json 2>&1

# Show mock UI output
echo -e "\n=== Mock UI Output ==="
cat /tmp/mock_ui_full.log

# Show workflow result
echo -e "\n=== Workflow Result ==="
cat /tmp/iot_workflow_full.json | python3 -m json.tool 2>/dev/null || cat /tmp/iot_workflow_full.json

# Cleanup
kill $MOCK_PID 2>/dev/null