#!/bin/bash

# Script to copy repository to ICME-Lab organization

echo "Copying repository to ICME-Lab organization..."

# 1. Clone the repository with all branches
git clone --mirror https://github.com/hshadab/verifiable-agentkit.git verifiable-agentkit-mirror
cd verifiable-agentkit-mirror

# 2. Create new repository on ICME-Lab (you need to do this via GitHub UI or API first)
echo "Please ensure you've created 'verifiable-agentkit' repository in ICME-Lab organization"
echo "Press Enter when ready..."
read

# 3. Change the remote to point to ICME-Lab
git remote set-url origin https://github.com/ICME-Lab/verifiable-agentkit.git

# 4. Push everything to the new repository
git push --mirror

# 5. Clean up
cd ..
rm -rf verifiable-agentkit-mirror

echo "Repository copied successfully!"
echo "New repository: https://github.com/ICME-Lab/verifiable-agentkit"

# Optional: If you want to add the ICME-Lab repo as a remote to your current local repo
echo ""
echo "To add ICME-Lab as a remote to your current repository, run:"
echo "git remote add icme-lab https://github.com/ICME-Lab/verifiable-agentkit.git"
echo "git push icme-lab main"