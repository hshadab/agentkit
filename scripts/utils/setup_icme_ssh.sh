#!/bin/bash

echo "Setting up SSH authentication for ICME-Lab..."

# Generate SSH key for ICME
echo "Generating SSH key for houman@icme.io..."
ssh-keygen -t ed25519 -C "houman@icme.io" -f ~/.ssh/id_ed25519_icme -N ""

# Display the public key
echo ""
echo "Copy this SSH public key and add it to your GitHub account (houmanicme):"
echo "Go to: https://github.com/settings/keys"
echo ""
cat ~/.ssh/id_ed25519_icme.pub
echo ""

# Configure SSH to use this key for GitHub
echo "Host github.com-icme
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_icme
    IdentitiesOnly yes" >> ~/.ssh/config

# Set up the remote with SSH
git remote remove icme-lab 2>/dev/null || true
git remote add icme-lab git@github.com-icme:ICME-Lab/verifiable-agentkit.git

echo ""
echo "After adding the SSH key to GitHub, you can push using:"
echo "  git push icme-lab main"