#!/bin/bash
echo "=== Tracing Workflow Response ==="
response=$(curl -s -X POST http://localhost:8002/execute_workflow \
  -H "Content-Type: application/json" \
  -d '{"command": "Generate KYC proof then send 0.1 USDC to Alice"}')

echo "=== Checking for table HTML ==="
echo "$response" | grep -o '<table[^>]*>' | head -n 3

echo "=== Checking response structure ==="
echo "$response" | jq '.message, .executionLog' 2>/dev/null | grep -i "table\|Multi-Step"

echo "=== Full response saved to /tmp/workflow_trace.json ==="
echo "$response" > /tmp/workflow_trace.json
