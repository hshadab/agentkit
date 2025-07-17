#!/bin/bash
# Test a single workflow to see detailed output

echo "Testing single workflow with detailed output"
echo "==========================================="

# Test the conditional command that's failing
command="If Charlie is KYC verified on-chain, send him 0.2 USDC on Ethereum"
echo "Command: $command"
echo

# Make the request and save full response
echo "Making request..."
response=$(curl -s -X POST http://localhost:8002/execute_workflow \
  -H "Content-Type: application/json" \
  -d "{\"command\": \"$command\"}")

# Check if successful
success=$(echo "$response" | jq -r '.success')
echo "Success: $success"

if [ "$success" = "false" ]; then
    echo
    echo "Error details:"
    echo "$response" | jq -r '.error' | head -10
    
    # Check if it's the regex parser error
    if echo "$response" | grep -q "workflowParser_generic_final.js"; then
        echo
        echo "ERROR: Still using regex parser instead of OpenAI!"
        echo "This suggests OpenAI parsing is not working correctly."
    fi
else
    echo
    echo "Workflow succeeded!"
    echo "Transfer IDs:"
    echo "$response" | jq -r '.transferIds[]'
fi

echo
echo "To debug further, check the server logs for [DEBUG] messages"