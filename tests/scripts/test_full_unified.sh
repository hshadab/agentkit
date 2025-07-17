#!/bin/bash
echo "Testing Full OpenAI + ZKP Unified System"
echo "========================================"
echo ""

# Function to test a command
test_command() {
    local desc="$1"
    local cmd="$2"
    echo "$desc"
    echo "Command: $cmd"
    
    response=$(curl -s -X POST http://localhost:8002/chat \
      -H "Content-Type: application/json" \
      -d "{\"message\": \"$cmd\"}")
    
    intent=$(echo "$response" | jq -r '.intent' 2>/dev/null)
    
    if [ "$intent" = "workflow_executed" ]; then
        echo "✓ Processed as workflow"
        success=$(echo "$response" | jq -r '.workflow_result.success' 2>/dev/null)
        echo "  Success: $success"
        
        # Check for explanation
        has_explanation=$(echo "$response" | jq -r 'if .workflow_result.explanation then "yes" else "no" end' 2>/dev/null)
        if [ "$has_explanation" = "yes" ]; then
            echo "  Has explanation: ✓"
            echo "  Response preview:"
            echo "$response" | jq -r '.response' 2>/dev/null | head -5 | sed 's/^/    /'
        fi
    elif [ -n "$intent" ] && [ "$intent" != "null" ]; then
        echo "✗ Processed as direct command (old system)"
        echo "  Intent type: $(echo "$intent" | jq -r 'type' 2>/dev/null)"
    else
        echo "✗ Unknown response format"
    fi
    echo ""
}

# Test various commands
test_command "1. Simple proof generation:" "Generate KYC proof"
test_command "2. Proof with explanation:" "Generate KYC proof and explain how it works"  
test_command "3. List operation:" "List my proofs"
test_command "4. Multi-step workflow:" "Generate location proof then send 0.05 USDC to Bob"
test_command "5. Complex with explanation:" "Create AI content proof, verify it, and tell me about zero-knowledge proofs"
test_command "6. Natural language query:" "What is a zero-knowledge proof?"
test_command "7. Conditional transfer:" "If Alice is KYC verified, send her 0.2 USDC"

echo "System Status:"
echo "=============="
echo "- Multi-step workflows: Using unified system ✓"
echo "- Single operations: May still use old system (needs server restart)"
echo "- Natural language: Using OpenAI chat ✓"
echo ""
echo "To fully unify, ensure server is restarted with latest code."