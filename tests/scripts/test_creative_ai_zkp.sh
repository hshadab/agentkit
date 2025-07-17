#!/bin/bash
echo "🎨 Creative AI + ZKP Integration Tests"
echo "======================================"
echo ""

# Function to test and format output
test_creative() {
    local desc="$1"
    local cmd="$2"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔸 $desc"
    echo "📝 Command: \"$cmd\""
    echo ""
    
    response=$(curl -s -X POST http://localhost:8002/chat \
      -H "Content-Type: application/json" \
      -d "{\"message\": \"$cmd\"}")
    
    success=$(echo "$response" | jq -r '.workflow_result.success' 2>/dev/null)
    ai_response=$(echo "$response" | jq -r '.workflow_result.ai_response' 2>/dev/null)
    
    if [ "$success" = "true" ] && [ "$ai_response" != "null" ]; then
        echo "✅ Success! AI Response:"
        echo "$ai_response" | fold -w 70 -s | sed 's/^/   /'
    else
        echo "❌ Failed or no AI response"
    fi
    echo ""
}

# Test various creative combinations
test_creative "Humor + ZKP" \
    "Create location proof and make a dad joke about GPS and privacy"

test_creative "Translation + ZKP" \
    "Generate AI content proof and describe it in pirate speak"

test_creative "Poetry + ZKP" \
    "Generate KYC proof and write a haiku about identity"

test_creative "Analysis + ZKP" \
    "Create location proof and analyze why location privacy matters"

test_creative "Simple (No AI)" \
    "Generate KYC proof"

test_creative "Business + ZKP" \
    "Generate AI content proof and pitch it like a startup idea"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Key Takeaways:"
echo "• ZKP operations can be enhanced with ANY type of AI processing"
echo "• The system adapts to creative requests: humor, poetry, analysis, etc."
echo "• Simple commands remain simple (no forced AI additions)"
echo "• True demonstration of AI making cryptography accessible AND fun!"