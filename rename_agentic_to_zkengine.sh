#!/bin/bash

# Script to rename /agentic to /zkengine and update all references
cd ~/agentkit

echo "🔄 Renaming agentic directory to zkengine and updating references..."

# Step 1: Create backups
echo "📦 Creating backups..."
cp src/main.rs src/main.rs.backup_rename_$(date +%Y%m%d_%H%M%S)
cp langchain_service.py langchain_service.py.backup_rename_$(date +%Y%m%d_%H%M%S)

# Step 2: Show current references before changing
echo "🔍 Current references to 'agentic' found:"
echo "In src/main.rs:"
grep -n "agentic" src/main.rs || echo "  No references found"
echo ""
echo "In langchain_service.py:"
grep -n "agentic" langchain_service.py || echo "  No references found"
echo ""

# Step 3: Update references in src/main.rs
echo "✏️  Updating src/main.rs..."
sed -i 's|agentic/|zkengine/|g' src/main.rs
sed -i 's|"agentic"|"zkengine"|g' src/main.rs
sed -i "s|'agentic'|'zkengine'|g" src/main.rs

# Step 4: Update references in langchain_service.py
echo "✏️  Updating langchain_service.py..."
sed -i 's|agentic/|zkengine/|g' langchain_service.py
sed -i 's|"agentic"|"zkengine"|g' langchain_service.py
sed -i "s|'agentic'|'zkengine'|g" langchain_service.py

# Step 5: Show updated references
echo "🔍 Updated references (should now say 'zkengine'):"
echo "In src/main.rs:"
grep -n "zkengine\|agentic" src/main.rs || echo "  No references found"
echo ""
echo "In langchain_service.py:"
grep -n "zkengine\|agentic" langchain_service.py || echo "  No references found"
echo ""

# Step 6: Rename the directory
echo "📁 Renaming directory agentic -> zkengine..."
if [ -d "agentic" ]; then
    mv agentic zkengine
    echo "✅ Directory renamed successfully!"
else
    echo "❌ Directory 'agentic' not found!"
    exit 1
fi

# Step 7: Verify the new structure
echo "🔍 Verifying new structure..."
ls -la zkengine/ 2>/dev/null && echo "✅ zkengine directory exists" || echo "❌ zkengine directory not found"
ls -la zkengine/zkEngine_dev/ 2>/dev/null && echo "✅ zkEngine_dev subdirectory exists" || echo "❌ zkEngine_dev not found"
ls -la zkengine/example_wasms/ 2>/dev/null && echo "✅ example_wasms subdirectory exists" || echo "❌ example_wasms not found"

# Step 8: Check for any remaining agentic references
echo ""
echo "🔍 Checking for any remaining 'agentic' references..."
remaining_refs=$(grep -r "agentic" src/main.rs langchain_service.py 2>/dev/null | wc -l)
if [ "$remaining_refs" -eq 0 ]; then
    echo "✅ All references updated successfully!"
else
    echo "⚠️  Found $remaining_refs remaining references:"
    grep -n "agentic" src/main.rs langchain_service.py 2>/dev/null
fi

echo ""
echo "🎉 Rename operation complete!"
echo "📦 Backups created:"
echo "   - src/main.rs.backup_rename_$(date +%Y%m%d_%H%M%S)"
echo "   - langchain_service.py.backup_rename_$(date +%Y%m%d_%H%M%S)"
echo ""
echo "🔄 Next steps:"
echo "   1. Test the system: cargo run"
echo "   2. Test Python service: python langchain_service.py"
echo "   3. If everything works, you can remove the backup files"
