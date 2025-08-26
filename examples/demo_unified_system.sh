#!/bin/bash
echo "🚀 Unified AI + ZKP System Demo"
echo "================================"
echo ""
echo "Demonstrating how OpenAI enhances EVERY zkEngine operation"
echo ""

# Colors for better output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to demo a command
demo_command() {
    local category="$1"
    local cmd="$2"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Category: $category${NC}"
    echo "Command: \"$cmd\""
    echo ""
    
    # Show parsing
    parse_response=$(curl -s -X POST http://localhost:8002/test_parser \
      -H "Content-Type: application/json" \
      -d "{\"message\": \"$cmd\"}")
    
    echo "Steps:"
    echo "$parse_response" | jq -r '.parsed_result.steps[] | "  • " + .type + ": " + .description' 2>/dev/null
    
    # Execute if it's a simple demo
    if [[ "$category" != "Complex Workflow" ]]; then
        response=$(curl -s -X POST http://localhost:8002/chat \
          -H "Content-Type: application/json" \
          -d "{\"message\": \"$cmd\"}")
        
        success=$(echo "$response" | jq -r '.workflow_result.success' 2>/dev/null)
        ai_response=$(echo "$response" | jq -r '.workflow_result.ai_response' 2>/dev/null)
        
        if [ "$success" = "true" ]; then
            echo -e "\n${GREEN}✓ Executed Successfully${NC}"
            if [ "$ai_response" != "null" ] && [ -n "$ai_response" ]; then
                echo -e "\nAI Enhancement:"
                echo "$ai_response" | head -5 | fold -w 60 -s | sed 's/^/  /'
                if [ $(echo "$ai_response" | wc -l) -gt 5 ]; then
                    echo "  ..."
                fi
            fi
        fi
    fi
    echo ""
}

# Demonstrate various capabilities
echo -e "${GREEN}1. PURE ZKP OPERATIONS (No AI Enhancement)${NC}"
demo_command "Simple Proof" "Generate KYC proof"
demo_command "Verification" "Verify proof_kyc_12345"

echo -e "${GREEN}2. ZKP + CREATIVE AI${NC}"
demo_command "Humor" "Generate location proof and tell me a joke about it"
demo_command "Poetry" "Create AI content proof and write a limerick"

echo -e "${GREEN}3. ZKP + EDUCATIONAL AI${NC}"
demo_command "ELI5" "Generate KYC proof and explain like I'm 5"
demo_command "Technical" "Create location proof with technical details"

echo -e "${GREEN}4. ZKP + MULTILINGUAL AI${NC}"
demo_command "Spanish" "Generate AI proof and describe it in Spanish"
demo_command "Emoji" "Create KYC proof and explain it using only emojis"

echo -e "${GREEN}5. ZKP + ANALYTICAL AI${NC}"
demo_command "Security" "Generate location proof and analyze security implications"
demo_command "Business" "Create AI proof and explain the ROI"

echo -e "${GREEN}6. COMPLEX WORKFLOWS${NC}"
demo_command "Complex Workflow" "If Alice is KYC verified, send her 0.1 USDC and celebrate with confetti"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🎯 System Capabilities:${NC}"
echo "✅ ALL zkEngine operations go through OpenAI for parsing"
echo "✅ Simple operations stay simple (no forced AI)"
echo "✅ Users can request ANY type of AI enhancement"
echo "✅ Seamless integration of cryptography with natural language"
echo "✅ Flexible system that adapts to user's communication style"
echo ""
echo "This demonstrates the power of combining zero-knowledge proofs"
echo "with AI - making advanced cryptography accessible, fun, and"
echo "adaptable to any user's needs!"