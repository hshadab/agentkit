#!/bin/bash
echo "Starting IoT workflow test with verbose output..."

# Kill any existing mock UI
pkill -f mock_ui_responder 2>/dev/null

# Start mock UI in background with output to file
node mock_ui_responder.js > /tmp/mock_ui_output.log 2>&1 &
MOCK_PID=$!
echo "Mock UI started with PID: $MOCK_PID"

sleep 2

# Run the workflow
echo "Executing IoT workflow..."
curl -s -X POST http://localhost:8002/execute_workflow \
  -H "Content-Type: application/json" \
  -d '{"command": "Register IoT device TEST123 with proximity proof"}' \
  --max-time 70 > /tmp/iot_workflow_result.json 2>&1 &

CURL_PID=$!

# Monitor for 20 seconds
for i in {1..20}; do
  echo "Waiting... $i seconds"
  sleep 1
  if ! kill -0 $CURL_PID 2>/dev/null; then
    echo "Workflow completed!"
    break
  fi
done

# Kill curl if still running
kill $CURL_PID 2>/dev/null

# Show mock UI output
echo -e "\n=== Mock UI Output ==="
cat /tmp/mock_ui_output.log

# Show workflow result
echo -e "\n=== Workflow Result ==="
cat /tmp/iot_workflow_result.json | python3 -m json.tool 2>/dev/null || cat /tmp/iot_workflow_result.json

# Cleanup
kill $MOCK_PID 2>/dev/null