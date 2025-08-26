#!/bin/bash

echo "Secure ICME-Lab Repository Push Setup"
echo "====================================="
echo ""
echo "This script will help you push to ICME-Lab without exposing your token"
echo ""

# First, ensure the repository exists
echo "Step 1: Make sure you've created 'verifiable-agentkit' in ICME-Lab organization"
echo "Press Enter when ready..."
read

# Remove old remote if exists
git remote remove icme-lab 2>/dev/null || true

# Get the token securely
echo ""
echo "Step 2: Enter your GitHub Personal Access Token (hidden):"
read -s GITHUB_TOKEN
echo ""

# Validate token is not empty
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: Token cannot be empty"
    exit 1
fi

# Add remote with token
echo "Setting up authenticated remote..."
git remote add icme-lab https://houmanicme:${GITHUB_TOKEN}@github.com/ICME-Lab/verifiable-agentkit.git

# Try to push
echo ""
echo "Attempting to push to ICME-Lab..."
if git push icme-lab main; then
    echo ""
    echo "✅ Success! Repository pushed to ICME-Lab"
    echo ""
    echo "View at: https://github.com/ICME-Lab/verifiable-agentkit"
    
    # Clean up the token from the remote URL for security
    git remote remove icme-lab
    git remote add icme-lab https://github.com/ICME-Lab/verifiable-agentkit.git
    
    echo ""
    echo "For future pushes, you'll need to authenticate again for security."
else
    echo ""
    echo "❌ Push failed. Possible reasons:"
    echo "1. Repository doesn't exist in ICME-Lab"
    echo "2. Token doesn't have 'repo' permissions"
    echo "3. You're not an owner of ICME-Lab"
    
    # Clean up on failure
    git remote remove icme-lab
    git remote add icme-lab https://github.com/ICME-Lab/verifiable-agentkit.git
fi

# Clear the token from memory
unset GITHUB_TOKEN