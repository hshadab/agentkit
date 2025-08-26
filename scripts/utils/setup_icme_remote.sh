#!/bin/bash

# Add ICME-Lab fork as a remote
echo "Adding ICME-Lab fork as remote..."

# Add the remote
git remote add icme-lab https://github.com/ICME-Lab/verifiable-agentkit.git

# Verify remotes
echo -e "\nCurrent remotes:"
git remote -v

# Push current main branch to ICME-Lab
echo -e "\nPushing main branch to ICME-Lab..."
git push icme-lab main

echo -e "\nDone! You can now push to both repositories:"
echo "  git push origin main    # Push to hshadab/verifiable-agentkit"
echo "  git push icme-lab main  # Push to ICME-Lab/verifiable-agentkit"
echo ""
echo "Or push to both at once:"
echo "  git push origin main && git push icme-lab main"