#!/bin/bash

# Update Import Paths Script
# Updates all import paths after codebase reorganization

echo "🔧 Updating import paths..."
echo "=========================="

# Backup index.html
cp static/index.html static/index.html.backup-$(date +%Y%m%d-%H%M%S)

# Update paths in index.html
echo "📝 Updating static/index.html..."

# Create temporary file with updated paths
cat static/index.html | \
sed 's|/static/js/nova-proof-formatter.js|/parsers/nova/nova-proof-formatter.js|g' | \
sed 's|/static/js/nova-proof-parser.js|/parsers/nova/nova-proof-parser.js|g' | \
sed 's|/static/js/nova-proof-parser-v2.js|/parsers/nova/nova-proof-parser-v2.js|g' | \
sed 's|/static/js/zkengine-nova-parser.js|/parsers/nova/zkengine-nova-parser.js|g' | \
sed 's|/static/js/simple-nova-verifier.js|/static/js/blockchain/simple-nova-verifier.js|g' | \
sed 's|/static/js/iotex-device-verifier.js|/static/js/blockchain/iotex-device-verifier.js|g' | \
sed 's|/static/js/blockchain-verifier.js|/static/js/blockchain/blockchain-verifier.js|g' | \
sed 's|/static/js/blockchain-verifier-wrapper.js|/static/js/blockchain/blockchain-verifier-wrapper.js|g' | \
sed 's|/static/js/device-workflow-handler.js|/static/js/ui/device-workflow-handler.js|g' | \
sed 's|/static/js/workflow-manager.js|/static/js/ui/workflow-manager.js|g' | \
sed 's|/static/js/ui-manager.js|/static/js/ui/ui-manager.js|g' | \
sed 's|/static/js/transfer-manager.js|/static/js/ui/transfer-manager.js|g' | \
sed 's|/static/js/proof-manager.js|/static/js/ui/proof-manager.js|g' | \
sed 's|/static/js/websocket-manager.js|/static/js/ui/websocket-manager.js|g' | \
sed 's|/static/js/config.js|/static/js/core/config.js|g' | \
sed 's|/static/js/utils.js|/static/js/core/utils.js|g' | \
sed 's|/static/js/debug-helper.js|/static/js/core/debug-helper.js|g' | \
sed 's|/static/js/ethers-fallback.js|/static/js/core/ethers-fallback.js|g' | \
sed 's|/static/js/ses-compatibility.js|/static/js/core/ses-compatibility.js|g' > static/index.html.tmp

# Replace original with updated version
mv static/index.html.tmp static/index.html

# Update imports in JavaScript files
echo ""
echo "📝 Updating JavaScript imports..."

# Update imports in main.js
if [ -f "static/js/main.js" ]; then
    echo "  - Updating static/js/main.js"
    sed -i.bak \
        -e "s|'./config.js'|'./core/config.js'|g" \
        -e "s|'./utils.js'|'./core/utils.js'|g" \
        -e "s|'./websocket-manager.js'|'./ui/websocket-manager.js'|g" \
        -e "s|'./ui-manager.js'|'./ui/ui-manager.js'|g" \
        -e "s|'./workflow-manager.js'|'./ui/workflow-manager.js'|g" \
        -e "s|'./transfer-manager.js'|'./ui/transfer-manager.js'|g" \
        -e "s|'./proof-manager.js'|'./ui/proof-manager.js'|g" \
        static/js/main.js
fi

# Update imports in UI files
for file in static/js/ui/*.js; do
    if [ -f "$file" ]; then
        echo "  - Updating $file"
        sed -i.bak \
            -e "s|'./config.js'|'../core/config.js'|g" \
            -e "s|'./utils.js'|'../core/utils.js'|g" \
            -e "s|from './|from '../|g" \
            "$file"
    fi
done

# Update imports in blockchain files
for file in static/js/blockchain/*.js; do
    if [ -f "$file" ]; then
        echo "  - Updating $file"
        sed -i.bak \
            -e "s|window.config|window.config|g" \
            -e "s|window.debugLog|window.debugLog|g" \
            "$file"
    fi
done

# Clean up backup files
echo ""
echo "🧹 Cleaning up backup files..."
find . -name "*.bak" -type f -delete

# Create a summary of moved files
echo ""
echo "📋 Creating file mapping documentation..."
cat > docs/FILE_REORGANIZATION.md << 'EOF'
# File Reorganization Map

This document shows the mapping of files moved during the codebase cleanup on $(date +%Y-%m-%d).

## Parser Files

### Nova Parsers (moved to `parsers/nova/`)
- `static/js/nova-proof-parser.js` → `parsers/nova/nova-proof-parser.js`
- `static/js/nova-proof-parser-v2.js` → `parsers/nova/nova-proof-parser-v2.js`
- `static/js/zkengine-nova-parser.js` → `parsers/nova/zkengine-nova-parser.js`
- `static/js/nova-proof-formatter.js` → `parsers/nova/nova-proof-formatter.js`

## Static JavaScript Files

### Blockchain (moved to `static/js/blockchain/`)
- All `*-verifier.js` files
- `blockchain-verifier.js`
- `blockchain-verifier-wrapper.js`

### UI Components (moved to `static/js/ui/`)
- All `*-manager.js` files
- All `*-handler.js` files

### Core Utilities (moved to `static/js/core/`)
- `config.js`
- `utils.js`
- `debug-helper.js`
- `ethers-fallback.js`
- `ses-compatibility.js`

## Test Files

### IoT Tests (moved to `tests/integration/iot/`)
- All `test_iot*.js` files
- All `test_device*.js` files

### UI Tests (moved to `tests/ui/`)
- All `test*.html` files (except `test-startup.html`)

### Integration Tests (moved to `tests/integration/`)
- All remaining `test_*.js` files
- All `test_*.py` files

## Circle Directory

### Archived Files (moved to `circle/archive/workflows-2025-01/`)
- All `parsed_workflow_*.json` files

### Removed Files
- `circle/workflowParser.js` (outdated)
- `circle/workflowExecutor.js` (outdated)
- `circle/workflowCLI*.js` (duplicates)
EOF

echo ""
echo "✅ Import paths updated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Test the application to ensure all imports work"
echo "2. Check browser console for any 404 errors"
echo "3. Run any automated tests"
echo ""
echo "💡 If you encounter issues:"
echo "- Check static/index.html.backup-* for the original"
echo "- Review docs/FILE_REORGANIZATION.md for file mappings"