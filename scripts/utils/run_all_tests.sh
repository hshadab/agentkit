#!/bin/bash
echo "🧪 Running Verifiable Agent Kit v7.2.1 Tests"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASSED=0
FAILED=0

# Function to run test
run_test() {
    echo -e "\n📋 $1"
    if eval "$2"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
    fi
}

# Test 1: Service health
run_test "Service Health Check" "curl -s http://localhost:8001/test > /dev/null && curl -s http://localhost:8002/docs > /dev/null"

# Test 2: Direct WebSocket
run_test "Direct WebSocket Proof" "cd ~/agentkit && timeout 15 node test-ws-direct.js 2>/dev/null | grep -q 'WebSocket test passed'"

# Test 3: OpenAI
run_test "OpenAI Integration" "curl -s -X POST http://localhost:8002/chat -H 'Content-Type: application/json' -d '{\"message\": \"What is 2+2?\"}' | jq -r '.response' | grep -q '4'"

# Test 4: Proof routing
run_test "Proof Command Routing" "curl -s -X POST http://localhost:8002/chat -H 'Content-Type: application/json' -d '{\"message\": \"Generate KYC proof\"}' | jq -r '.intent.function' | grep -q 'prove_kyc'"

# Test 5: History
run_test "History Command" "curl -s -X POST http://localhost:8002/chat -H 'Content-Type: application/json' -d '{\"message\": \"Proof History\"}' | jq -r '.intent.function' | grep -q 'list_proofs'"

# Test 6: Simple workflow
echo -e "\n📋 Simple Workflow (this takes ~15s)"
RESULT=$(curl -s -X POST http://localhost:8002/execute_workflow -H 'Content-Type: application/json' -d '{"command": "Generate KYC proof"}' 2>/dev/null)
if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    echo "Response: $RESULT"
    ((FAILED++))
fi

# Summary
echo -e "\n=========================================="
echo "📊 TEST SUMMARY"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo -e "Total:  $((PASSED + FAILED))"
echo "=========================================="

exit $FAILED
