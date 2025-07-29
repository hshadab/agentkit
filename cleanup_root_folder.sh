#!/bin/bash

# Script to organize files in the agentkit root folder
# This script moves files to appropriate directories to clean up the root

echo "🧹 Starting agentkit root folder cleanup..."
echo "================================================"

# Create directories if they don't exist
mkdir -p tests/root-tests
mkdir -p docs/status-reports
mkdir -p scripts/utilities
mkdir -p archive/old-backups

# Move test files to tests/
echo "📂 Moving test files to tests/root-tests/..."
for file in test_*.js test_*.html test_*.sh; do
    if [ -f "$file" ]; then
        echo "  Moving $file"
        mv "$file" tests/root-tests/
    fi
done

for file in debug_*.html debug_*.js; do
    if [ -f "$file" ]; then
        echo "  Moving $file"
        mv "$file" tests/root-tests/
    fi
done

for file in check_*.js check_*.html; do
    if [ -f "$file" ]; then
        echo "  Moving $file"
        mv "$file" tests/root-tests/
    fi
done

for file in demo_*.js; do
    if [ -f "$file" ]; then
        echo "  Moving $file"
        mv "$file" tests/root-tests/
    fi
done

# Move documentation files to docs/
echo -e "\n📄 Moving documentation files to docs/status-reports/..."
for file in *_STATUS.md *_SUMMARY.md *_REPORT.md *_PROOF.md; do
    if [ -f "$file" ]; then
        echo "  Moving $file"
        mv "$file" docs/status-reports/
    fi
done

# Move non-main README files
for file in README_*.md; do
    if [ -f "$file" ]; then
        echo "  Moving $file"
        mv "$file" docs/
    fi
done

# Move other documentation
for file in ARCHITECTURE.md API_DOCUMENTATION.md CHANGELOG.md SETUP.md PORT_CONFIGURATION.md DIRECTORY_STRUCTURE.md; do
    if [ -f "$file" ]; then
        echo "  Moving $file"
        mv "$file" docs/
    fi
done

# Move utility scripts
echo -e "\n🔧 Moving utility scripts..."
for file in workflow_responder.js mock_ui_responder.js; do
    if [ -f "$file" ]; then
        echo "  Moving $file to scripts/utilities/"
        mv "$file" scripts/utilities/
    fi
done

for file in run_*.sh; do
    if [ -f "$file" ]; then
        echo "  Moving $file to scripts/"
        mv "$file" scripts/
    fi
done

# Move WAT files (duplicates of WASM files)
echo -e "\n📦 Moving duplicate WAT files..."
for file in device_proximity*.wat; do
    if [ -f "$file" ]; then
        echo "  Moving $file to zkengine_binary/"
        mv "$file" zkengine_binary/
    fi
done

# Archive old files
echo -e "\n🗄️  Archiving old files..."
for file in backup-*.tar.gz; do
    if [ -f "$file" ]; then
        echo "  Moving $file to archive/old-backups/"
        mv "$file" archive/old-backups/
    fi
done

# Clean up old logs (ask for confirmation)
echo -e "\n🗑️  Log files found:"
ls -la *.log 2>/dev/null || echo "  No log files found"

read -p "Do you want to remove old log files? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    for file in *.log; do
        if [ -f "$file" ]; then
            echo "  Removing $file"
            rm "$file"
        fi
    done
fi

# Create a summary file
echo -e "\n📝 Creating cleanup summary..."
cat > docs/CLEANUP_SUMMARY_$(date +%Y%m%d).md << EOF
# Root Folder Cleanup Summary - $(date +%Y-%m-%d)

## Files Moved

### Test Files → tests/root-tests/
$(ls tests/root-tests/ 2>/dev/null | grep -E '^(test_|debug_|check_|demo_)' | sed 's/^/- /')

### Documentation → docs/status-reports/
$(ls docs/status-reports/ 2>/dev/null | grep -E '_STATUS\.md|_SUMMARY\.md|_REPORT\.md|_PROOF\.md' | sed 's/^/- /')

### Documentation → docs/
$(ls docs/ | grep -E '^(README_|ARCHITECTURE|API_DOCUMENTATION|CHANGELOG|SETUP|PORT_CONFIGURATION|DIRECTORY_STRUCTURE)' | sed 's/^/- /')

### Scripts → scripts/utilities/
$(ls scripts/utilities/ 2>/dev/null | grep -E 'workflow_responder|mock_ui_responder' | sed 's/^/- /')

### Scripts → scripts/
$(ls scripts/ | grep '^run_' | sed 's/^/- /')

## Files Remaining in Root
These files are appropriately placed in the root directory:
- README.md (main project documentation)
- LICENSE (license file)
- package.json, package-lock.json (Node.js configuration)
- Cargo.toml, Cargo.lock (Rust configuration)
- requirements.txt (Python dependencies)
- hardhat.config.js (Hardhat configuration)
- .gitignore (Git configuration)
- env.example (Environment template)

## Cleanup Actions Taken
- Moved test files to organized test directories
- Moved documentation to appropriate folders
- Moved utility scripts to scripts folder
- Archived old backup files
- Cleaned up duplicate WAT files
EOF

echo -e "\n✅ Cleanup complete!"
echo "   Summary saved to: docs/CLEANUP_SUMMARY_$(date +%Y%m%d).md"
echo -e "\n📊 Root folder file count:"
echo "   Before: $(git ls-files | grep -E '^[^/]+$' | wc -l) files"
echo "   After: $(ls -1 | wc -l) files"

# Show remaining files in root
echo -e "\n📋 Files remaining in root:"
ls -1 | sort