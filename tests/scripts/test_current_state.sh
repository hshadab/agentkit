#!/bin/bash
# Test current state of the system

echo "Testing current state of OpenAI parsing"
echo "======================================="

# Test 1: Check if server is responding
echo -e "\n1. Server health check:"
curl -s http://localhost:8002/docs > /dev/null && echo "✓ Server is running" || echo "✗ Server not responding"

# Test 2: Test simple chat to verify OpenAI works
echo -e "\n2. Testing OpenAI chat endpoint:"
response=$(curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is 2+2?"}')
  
answer=$(echo "$response" | jq -r '.response' 2>/dev/null || echo "Failed")
echo "Response: $answer"

# Test 3: Test workflow with detailed error
echo -e "\n3. Testing workflow parsing:"
response=$(curl -s -X POST http://localhost:8002/execute_workflow \
  -H "Content-Type: application/json" \
  -d '{"command": "Generate KYC proof then send 0.1 USDC to Alice"}')

error=$(echo "$response" | jq -r '.error' 2>/dev/null | head -3)
echo "Error: $error"

# Test 4: Check if it mentions GPT-4 or response_format
echo -e "\n4. Checking error details:"
echo "$response" | grep -o "gpt-4\|response_format\|json_object" | sort | uniq || echo "No model/format errors found"