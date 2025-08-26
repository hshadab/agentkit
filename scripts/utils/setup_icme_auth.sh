#!/bin/bash

echo "Setting up ICME-Lab authentication..."

# Set up git credentials for ICME
echo "Enter your GitHub Personal Access Token for houmanicme:"
read -s GITHUB_TOKEN

# Configure git to use the token for ICME-Lab
git config --global credential.https://github.com/ICME-Lab.helper store
echo "https://houmanicme:${GITHUB_TOKEN}@github.com" > ~/.git-credentials-icme

# Set up the remote with authentication
git remote remove icme-lab 2>/dev/null || true
git remote add icme-lab https://houmanicme:${GITHUB_TOKEN}@github.com/ICME-Lab/verifiable-agentkit.git

echo "Authentication configured!"
echo ""
echo "You can now push to ICME-Lab using:"
echo "  git push icme-lab main"