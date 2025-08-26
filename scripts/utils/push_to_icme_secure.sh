#!/bin/bash

echo "Secure Push to ICME-Lab/verifiable-agent-kit"
echo "============================================="
echo ""
echo "This will push your repository to: https://github.com/ICME-Lab/verifiable-agent-kit"
echo ""

# Check if GITHUB_TOKEN is already set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Please set your GitHub token first:"
    echo "  export GITHUB_TOKEN='your_new_token_here'"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "Token detected. Attempting to push..."
echo ""

# Push to ICME-Lab
if git push https://houmanicme:${GITHUB_TOKEN}@github.com/ICME-Lab/verifiable-agent-kit.git main --force; then
    echo ""
    echo "✅ Success! Repository pushed to ICME-Lab"
    echo ""
    echo "View at: https://github.com/ICME-Lab/verifiable-agent-kit"
    echo ""
    echo "Remember to clear your token:"
    echo "  unset GITHUB_TOKEN"
else
    echo ""
    echo "❌ Push failed. Please check:"
    echo "1. Your token has 'repo' permissions"
    echo "2. You have access to ICME-Lab organization"
    echo "3. The repository exists"
fi