#!/bin/bash

# This script prepares the repository for GitHub update with only essential files

echo "Preparing repository for GitHub update..."

# First, let's add the chat_service.py if it's untracked
if git status --porcelain | grep -q "^?? chat_service.py"; then
    echo "Adding chat_service.py..."
    git add chat_service.py
fi

# Add essential new files
echo "Adding essential new files..."
git add parsers/workflow/workflowExecutor.js
git add static/ethereum-verifier.js
git add static/solana-verifier.js

# Add updated files
echo "Adding updated files..."
git add README.md
git add src/main.rs
git add static/index.html
git add circle/circleHandler.js
git add Cargo.toml
git add Cargo.lock
git add package.json
git add package-lock.json
git add requirements.txt

# Create .gitignore if it doesn't exist or update it
echo "Creating/updating .gitignore..."
cat > .gitignore << 'EOF'
# Environment files
.env
.env.*
!.env.example

# Build directories
target/
build/
dist/
node_modules/
__pycache__/
*.pyc
.pytest_cache/

# Proof files
proofs/
artifacts/
cache/
ceremony/

# Database files
proofs_db.json
verifications_db.json
kyc_transfers.json
kyc_verifications.json
workflow_history.json

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Test and debug files
test_*.py
test_*.js
test-*.js
debug_*.py
debug_*.js
*_test.*
*_debug.*
*_fix.*
*_backup.*
*.backup
*.old
*.orig
*.rej

# Documentation and fix files
SOLANA_*.md
ETHEREUM_*.md
FIX_*.md
TEST_*.md
DEPLOY_*.md
CHECK_*.md
*_FIX.md
*_TEST.md
*_STATUS.md
*_ANALYSIS.md

# Scripts and tools
check-*.sh
fix_*.py
fix_*.js
add_*.py
add_*.js
apply_*.py
create_*.py
diagnose_*.py
diagnose_*.js
update_*.py
validate_*.py
analyze-*.sh
manual_*.py
manual_*.js
simple_*.py
simple_*.js
monitor_*.py
monitor_*.js

# Temporary and build files
*.log
*.tmp
*.temp
*.cache
.~*

# zkEngine build artifacts
zkengine/example_wasms/target/
zkengine/example_wasms/*.d

# Exclude all fix/test/debug markdown files
*.md
!README.md
!LICENSE.md

# Exclude backup and test directories
backups/
test*/
debug*/
scripts/
contracts/
circuits/
solana/
EOF

echo "Files ready to commit. Review the changes with:"
echo "  git status"
echo ""
echo "If everything looks good, commit and push with:"
echo "  git commit -m 'v4.2: OpenAI integration, enhanced UI, and improved blockchain verification'"
echo "  git push origin main"
echo ""
echo "Files that will be committed:"
git status --porcelain | grep -E '^(A |M )' | awk '{print "  - " $2}'