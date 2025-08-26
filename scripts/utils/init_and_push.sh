#!/bin/bash

echo "Initialize and push to ICME-Lab"
echo "==============================="
echo ""
echo "This script will:"
echo "1. Create a temporary initial commit"
echo "2. Push to initialize the repo" 
echo "3. Then force push your actual code"
echo ""
echo "Make sure to set: export GITHUB_TOKEN='your_token'"
echo ""

if [ -z "$GITHUB_TOKEN" ]; then
    echo "ERROR: Set GITHUB_TOKEN first!"
    exit 1
fi

# Save current branch
CURRENT_BRANCH=$(git branch --show-current)

# Create temporary branch
git checkout -b temp-init
echo "# verifiable-agent-kit" > README_TEMP.md
git add README_TEMP.md
git commit -m "Initial commit"

# Try to push the initial commit
echo "Pushing initial commit..."
if git push https://houmanicme:${GITHUB_TOKEN}@github.com/ICME-Lab/verifiable-agent-kit.git temp-init:main; then
    echo "✅ Initial push successful!"
    
    # Now switch back and force push the real content
    git checkout $CURRENT_BRANCH
    git branch -D temp-init
    rm README_TEMP.md
    
    echo ""
    echo "Now pushing your actual code..."
    git push https://houmanicme:${GITHUB_TOKEN}@github.com/ICME-Lab/verifiable-agent-kit.git main --force
else
    echo "❌ Still getting permission error"
    git checkout $CURRENT_BRANCH
    git branch -D temp-init
    rm -f README_TEMP.md
fi