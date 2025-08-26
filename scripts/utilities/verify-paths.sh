#!/bin/bash

echo "🔍 Verifying all paths are updated..."
echo "===================================="

# Check for old paths in HTML files
echo -e "\n📄 Checking HTML files for old paths..."
old_paths_html=$(grep -r "static/js/[^/]*\.js" . --include="*.html" --exclude-dir=node_modules --exclude-dir=venv --exclude-dir=.git --exclude-dir=backup* | grep -v "static/js/main.js" | grep -v "static/js/blockchain/" | grep -v "static/js/ui/" | grep -v "static/js/core/" | wc -l)
if [ "$old_paths_html" -eq 0 ]; then
    echo "✅ All HTML files updated"
else
    echo "❌ Found $old_paths_html HTML files with old paths:"
    grep -r "static/js/[^/]*\.js" . --include="*.html" --exclude-dir=node_modules --exclude-dir=venv --exclude-dir=.git | grep -v "static/js/main.js" | grep -v "static/js/blockchain/" | grep -v "static/js/ui/" | grep -v "static/js/core/"
fi

# Check for old import paths in JS files
echo -e "\n📄 Checking JS imports..."
old_imports=$(grep -r "from '\./[^/]*\.js'" static/js/ui/ static/js/blockchain/ 2>/dev/null | grep -v "from '\.\./core/" | grep -v "from '\.\./" | wc -l)
if [ "$old_imports" -eq 0 ]; then
    echo "✅ All JS imports updated"
else
    echo "❌ Found $old_imports JS files with old imports"
fi

# Verify Nova parsers are accessible
echo -e "\n📦 Checking Nova parser location..."
if [ -d "static/parsers/nova" ]; then
    echo "✅ Nova parsers in correct location: static/parsers/nova/"
    ls -la static/parsers/nova/
else
    echo "❌ Nova parsers directory not found!"
fi

# Check if all expected files exist
echo -e "\n📂 Verifying directory structure..."
dirs_to_check=(
    "static/js/blockchain"
    "static/js/ui"
    "static/js/core"
    "static/parsers/nova"
    "parsers/workflow"
    "tests/integration"
    "tests/ui"
)

for dir in "${dirs_to_check[@]}"; do
    if [ -d "$dir" ]; then
        count=$(find "$dir" -type f -name "*.js" -o -name "*.html" -o -name "*.py" | wc -l)
        echo "✅ $dir exists with $count files"
    else
        echo "❌ $dir missing!"
    fi
done

# Summary
echo -e "\n📊 Summary:"
echo "- Nova parsers moved to: static/parsers/nova/"
echo "- UI components in: static/js/ui/"
echo "- Blockchain verifiers in: static/js/blockchain/"
echo "- Core utilities in: static/js/core/"
echo "- Tests organized in: tests/"
echo -e "\n✅ Path verification complete!"