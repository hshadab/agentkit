#!/bin/bash
# Script to update GitHub with all changes

echo "🚀 Updating Verifiable Agent Kit on GitHub..."
echo ""

# Check git status
echo "📋 Current git status:"
git status --short
echo ""

# Add all modified files
echo "📁 Adding modified files..."
git add chat_service.py
git add static/index.html
git add circle/workflowParser_generic_final.js
git add circle/workflowExecutor_generic.js
git add UPDATE_SUMMARY.md

# Add new test files if you want to include them
# git add test_openai_parser.py
# git add test_regex_parser.sh
# git add test_direct_workflow.sh

echo ""
echo "✅ Files staged for commit"
echo ""

# Show what will be committed
echo "📝 Changes to be committed:"
git diff --cached --stat
echo ""

echo "💡 To commit and push these changes, run:"
echo ""
echo "git commit -F commit_message.txt"
echo "git push origin main"
echo ""
echo "Or use the shorter commit message:"
echo "git commit -m \"feat: Add OpenAI integration for intelligent workflow parsing\""
echo ""

# Optionally, create a release
echo "📦 After pushing, consider creating a new release (v4.2) on GitHub with the UPDATE_SUMMARY.md content"