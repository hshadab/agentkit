#!/bin/bash

# Codebase Cleanup Script
# This script reorganizes the agentkit codebase for better structure and consistency

set -e  # Exit on error

echo "🧹 Starting codebase cleanup..."
echo "================================"

# Create backup first
BACKUP_NAME="backup-before-cleanup-$(date +%Y%m%d-%H%M%S).tar.gz"
echo "📦 Creating backup: $BACKUP_NAME"
tar -czf "$BACKUP_NAME" --exclude='node_modules' --exclude='venv' --exclude='.git' --exclude='target' .
echo "✅ Backup created successfully"

# 1. Remove outdated parsers in Circle directory
echo ""
echo "🗑️  Removing outdated parsers in circle/ directory..."
if [ -f "circle/workflowParser.js" ]; then
    rm circle/workflowParser.js
    echo "  - Removed circle/workflowParser.js (outdated)"
fi
if [ -f "circle/workflowExecutor.js" ]; then
    rm circle/workflowExecutor.js
    echo "  - Removed circle/workflowExecutor.js (outdated)"
fi

# 2. Consolidate Nova parsers
echo ""
echo "📁 Consolidating Nova parsers..."
mkdir -p parsers/nova
if [ -f "static/js/nova-proof-parser.js" ]; then
    mv static/js/nova-proof-parser.js parsers/nova/
    echo "  - Moved nova-proof-parser.js"
fi
if [ -f "static/js/nova-proof-parser-v2.js" ]; then
    mv static/js/nova-proof-parser-v2.js parsers/nova/
    echo "  - Moved nova-proof-parser-v2.js"
fi
if [ -f "static/js/zkengine-nova-parser.js" ]; then
    mv static/js/zkengine-nova-parser.js parsers/nova/
    echo "  - Moved zkengine-nova-parser.js"
fi
if [ -f "static/js/nova-proof-formatter.js" ]; then
    mv static/js/nova-proof-formatter.js parsers/nova/
    echo "  - Moved nova-proof-formatter.js"
fi

# 3. Organize static/js directory
echo ""
echo "🏗️  Organizing static/js directory..."
mkdir -p static/js/blockchain
mkdir -p static/js/ui
mkdir -p static/js/core

# Move blockchain-related files
for file in static/js/*-verifier.js static/js/blockchain-verifier*.js; do
    if [ -f "$file" ]; then
        mv "$file" static/js/blockchain/
        echo "  - Moved $(basename "$file") to blockchain/"
    fi
done

# Move UI components
for file in static/js/*-manager.js static/js/*-handler.js; do
    if [ -f "$file" ]; then
        mv "$file" static/js/ui/
        echo "  - Moved $(basename "$file") to ui/"
    fi
done

# Move core utilities
for file in config.js utils.js debug-helper.js ethers-fallback.js ses-compatibility.js; do
    if [ -f "static/js/$file" ]; then
        mv "static/js/$file" static/js/core/
        echo "  - Moved $file to core/"
    fi
done

# 4. Clean up test files
echo ""
echo "🧪 Organizing test files..."
mkdir -p tests/integration/iot
mkdir -p tests/ui

# Move IoT tests
for file in test_iot*.js test_device*.js; do
    if [ -f "$file" ]; then
        mv "$file" tests/integration/iot/
        echo "  - Moved $file to tests/integration/iot/"
    fi
done

# Move UI test files
for file in test*.html; do
    if [ -f "$file" ] && [[ "$file" != "test-startup.html" ]]; then
        mv "$file" tests/ui/
        echo "  - Moved $file to tests/ui/"
    fi
done

# Move other integration tests
for file in test_*.js test_*.py; do
    if [ -f "$file" ]; then
        mv "$file" tests/integration/
        echo "  - Moved $file to tests/integration/"
    fi
done

# 5. Archive old workflow outputs
echo ""
echo "📦 Archiving old workflow outputs..."
mkdir -p circle/archive/workflows-2025-01

# Move all parsed workflow JSONs
count=0
for file in circle/parsed_workflow_*.json; do
    if [ -f "$file" ]; then
        mv "$file" circle/archive/workflows-2025-01/
        ((count++))
    fi
done
echo "  - Archived $count workflow JSON files"

# 6. Remove duplicate workflow files in circle/
echo ""
echo "🔄 Removing duplicate files..."
for file in circle/workflowCLI*.js; do
    if [ -f "$file" ]; then
        rm "$file"
        echo "  - Removed duplicate $(basename "$file")"
    fi
done

# 7. Create directories that might be missing
echo ""
echo "📂 Ensuring directory structure..."
mkdir -p parsers/workflow
mkdir -p circle/api
mkdir -p proofs/archive
mkdir -p docs/archive

# 8. Move any remaining scattered files
echo ""
echo "🧹 Final cleanup..."
# Move demo files to examples
if [ -f "demo_device_proximity.js" ]; then
    mv demo_device_proximity.js examples/
    echo "  - Moved demo_device_proximity.js to examples/"
fi

# Move mock responders to tests
if [ -f "mock_ui_responder.js" ]; then
    mv mock_ui_responder.js tests/
    echo "  - Moved mock_ui_responder.js to tests/"
fi
if [ -f "workflow_responder.js" ]; then
    mv workflow_responder.js tests/
    echo "  - Moved workflow_responder.js to tests/"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "⚠️  Next steps:"
echo "1. Run: ./update-import-paths.sh"
echo "2. Test all functionality"
echo "3. Commit changes with: git add -A && git commit -m 'refactor: Reorganize codebase structure for better maintainability'"
echo ""
echo "📋 Summary of changes:"
echo "  - Removed outdated parsers from circle/"
echo "  - Consolidated Nova parsers in parsers/nova/"
echo "  - Organized static/js into blockchain/, ui/, and core/"
echo "  - Moved test files to tests/ directory"
echo "  - Archived old workflow outputs"
echo "  - Removed duplicate files"