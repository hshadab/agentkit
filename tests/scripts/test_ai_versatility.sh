#!/bin/bash
echo "Testing AI + ZKP Versatility"
echo "============================"
echo ""
echo "Showing how OpenAI can process ZKP operations in ANY way requested"
echo ""

# Function to test and display results
test_command() {
    local desc="$1"
    local cmd="$2"
    echo "────────────────────────────────────────────────────"
    echo "$desc"
    echo "Command: \"$cmd\""
    echo ""
    
    # First show what steps will be created
    response=$(curl -s -X POST http://localhost:8002/test_parser \
      -H "Content-Type: application/json" \
      -d "{\"message\": \"$cmd\"}")
    
    echo "Parsed steps:"
    echo "$response" | jq -r '.parsed_result.steps[] | "  → " + .type + ": " + .description'
    
    # Check if AI processing is included
    has_ai=$(echo "$response" | jq -r '.parsed_result.steps[] | select(.type == "process_with_ai") | .request' 2>/dev/null)
    if [ -n "$has_ai" ]; then
        echo ""
        echo "AI Request: $has_ai"
    fi
    echo ""
}

# Test various creative combinations
test_command "1. HUMOR:" "Generate KYC proof and tell me a joke about it"

test_command "2. TRANSLATION:" "Create location proof and describe it in Spanish"

test_command "3. ELI5:" "Generate AI content proof and explain it like I'm 5 years old"

test_command "4. ANALYSIS:" "List my proofs and analyze their security implications"

test_command "5. NO AI (Control):" "Generate KYC proof"

test_command "6. CREATIVE:" "Create location proof but make it sound like a spy movie"

test_command "7. TECHNICAL:" "Generate AI proof and give me the technical cryptographic details"

test_command "8. POETRY:" "Verify proof_kyc_123 and write a haiku about it"

test_command "9. BUSINESS:" "Generate KYC proof and explain the business value"

test_command "10. MULTIPLE LANGUAGES:" "Create location proof and summarize in French"

echo "────────────────────────────────────────────────────"
echo ""
echo "Key Points:"
echo "• AI processing is ONLY added when explicitly requested"
echo "• Simple commands like 'Generate KYC proof' remain simple (no AI)"
echo "• Users can request ANY type of AI processing: humor, translation, analysis, etc."
echo "• The system adapts to the user's specific request"
echo "• This showcases true AI + ZKP integration beyond just education"