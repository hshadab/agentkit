#!/bin/bash

echo "Update remote after GitHub repository rename"
echo "==========================================="
echo ""
echo "Enter the new repository name:"
read NEW_NAME

# Update the remote URL
git remote remove icme-lab 2>/dev/null || true
git remote add icme-lab https://github.com/ICME-Lab/${NEW_NAME}.git

echo ""
echo "Remote updated to: https://github.com/ICME-Lab/${NEW_NAME}"
echo ""
echo "Current remotes:"
git remote -v