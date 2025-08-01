#!/bin/bash

# Test proximity proof workflow
echo "=== Testing Proximity Proof Workflow ==="

# Test device registration and proximity proof
COMMAND="Register IoT device TESTDEV123 with proximity proof at location 5050,5050"

echo "Testing command: $COMMAND"
echo ""

# Send command to chat service
RESPONSE=$(curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"$COMMAND\"}")

echo "Response from chat service:"
echo "$RESPONSE" | jq .

# Extract workflow result if present
WORKFLOW_ID=$(echo "$RESPONSE" | jq -r '.workflow_result.workflowId // empty')

if [ -n "$WORKFLOW_ID" ]; then
  echo ""
  echo "Workflow ID: $WORKFLOW_ID"
  echo "Check browser console for detailed parser output"
  
  # Give workflow time to process
  sleep 10
  
  # Check workflow history
  echo ""
  echo "Checking workflow history..."
  curl -s http://localhost:8002/workflow_history | jq '.workflows[0]'
else
  echo "No workflow ID found in response"
fi