#!/bin/bash

echo "🔧 Comprehensive fix for ethers.js v6 to v5 syntax conversion..."

# Function to fix a file
fix_file() {
    local file="$1"
    local changed=false
    
    # Check if file contains any ethers v6 syntax
    if grep -q "ethers\.parseEther\|ethers\.formatEther\|ethers\.id\|ethers\.keccak256\|ethers\.toUtf8Bytes\|ethers\.JsonRpcProvider" "$file"; then
        echo "🔧 Fixing $file..."
        
        # Create backup
        cp "$file" "$file.backup"
        
        # Fix ethers v6 syntax to v5 syntax
        sed -i 's/ethers\.parseEther(/ethers.utils.parseEther(/g' "$file"
        sed -i 's/ethers\.formatEther(/ethers.utils.formatEther(/g' "$file"
        sed -i 's/ethers\.id(/ethers.utils.id(/g' "$file"
        sed -i 's/ethers\.keccak256(/ethers.utils.keccak256(/g' "$file"
        sed -i 's/ethers\.toUtf8Bytes(/ethers.utils.toUtf8Bytes(/g' "$file"
        sed -i 's/ethers\.JsonRpcProvider(/ethers.providers.JsonRpcProvider(/g' "$file"
        
        echo "✅ Fixed $file"
        changed=true
    fi
    
    if [ "$changed" = true ]; then
        echo "📝 Changes made to $file"
    fi
}

# Fix all JavaScript files recursively
echo "🔍 Searching for JavaScript files with ethers v6 syntax..."

# Search in static directory
find static/ -name "*.js" -type f | while read file; do
    fix_file "$file"
done

# Search in parsers directory  
find parsers/ -name "*.js" -type f | while read file; do
    fix_file "$file"
done

# Search in root directory (but exclude node_modules)
find . -maxdepth 1 -name "*.js" -type f | while read file; do
    fix_file "$file"
done

# Search in scripts directory
find scripts/ -name "*.js" -type f 2>/dev/null | while read file; do
    fix_file "$file"
done

# Search in tests directory
find tests/ -name "*.js" -type f 2>/dev/null | while read file; do
    fix_file "$file"
done

# Also check .cjs files
find . -name "*.cjs" -type f -not -path "./node_modules/*" | while read file; do
    fix_file "$file"
done

echo "🎉 Ethers.js v6 to v5 syntax conversion completed!"
echo "💡 Backup files created with .backup extension"

# Verify the fix worked
echo "🔍 Checking for any remaining ethers v6 syntax..."
remaining=$(find . -name "*.js" -o -name "*.cjs" | grep -v node_modules | grep -v ".backup" | xargs grep -l "ethers\.parseEther\|ethers\.formatEther\|ethers\.id\|ethers\.keccak256\|ethers\.toUtf8Bytes\|ethers\.JsonRpcProvider" 2>/dev/null || true)

if [ -z "$remaining" ]; then
    echo "✅ No remaining ethers v6 syntax found!"
else
    echo "⚠️  Files still containing ethers v6 syntax:"
    echo "$remaining"
fi