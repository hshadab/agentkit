#!/bin/bash

# Cleanup script for Agentkit
# Removes unused files while preserving important ones

echo "🧹 Agentkit Cleanup Script"
echo "========================="
echo ""

# Dry run by default
DRY_RUN=${1:-dry}

if [ "$DRY_RUN" = "dry" ]; then
    echo "Running in DRY RUN mode. No files will be deleted."
    echo "To actually delete files, run: ./cleanup.sh delete"
    echo ""
fi

# Function to remove files
remove_files() {
    local pattern=$1
    local description=$2
    
    echo "🔍 $description"
    echo "---"
    
    count=$(find . -name "$pattern" | grep -v node_modules | grep -v .git | grep -v venv | wc -l)
    
    if [ "$count" -gt 0 ]; then
        echo "Found $count files:"
        find . -name "$pattern" | grep -v node_modules | grep -v .git | grep -v venv | head -10
        
        if [ "$count" -gt 10 ]; then
            echo "... and $((count - 10)) more"
        fi
        
        if [ "$DRY_RUN" != "dry" ]; then
            find . -name "$pattern" | grep -v node_modules | grep -v .git | grep -v venv | xargs rm -f
            echo "✅ Removed $count files"
        fi
    else
        echo "No files found"
    fi
    echo ""
}

# Remove backup files
remove_files "*.backup" "Backup files (.backup)"
remove_files "*.backup[0-9]" "Numbered backup files"
remove_files "*.bak" "Backup files (.bak)"
remove_files "*.old" "Old files (.old)"
remove_files "*.orig" "Original files (.orig)"

# Remove temporary files
remove_files "*.tmp" "Temporary files"
remove_files "*.temp" "Temporary files (.temp)"
remove_files "*.log" "Log files"

# Remove debug scripts (now in tests/)
remove_files "debug_*.py" "Debug Python scripts"
remove_files "debug_*.js" "Debug JavaScript files"
remove_files "fix_*.py" "Fix Python scripts"
remove_files "fix_*.js" "Fix JavaScript files"

# Remove test files from root (already moved to tests/)
if [ -d "tests" ]; then
    echo "🔍 Test files in root directory"
    echo "---"
    count=$(find . -maxdepth 1 -name "test*" | wc -l)
    if [ "$count" -gt 0 ]; then
        echo "Found $count test files that should be in tests/"
        if [ "$DRY_RUN" != "dry" ]; then
            find . -maxdepth 1 -name "test*" -exec rm -f {} \;
            echo "✅ Removed test files from root"
        fi
    else
        echo "No test files in root (good!)"
    fi
    echo ""
fi

# Remove Python cache
echo "🔍 Python cache directories"
echo "---"
cache_count=$(find . -type d -name "__pycache__" | wc -l)
if [ "$cache_count" -gt 0 ]; then
    echo "Found $cache_count __pycache__ directories"
    if [ "$DRY_RUN" != "dry" ]; then
        find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
        echo "✅ Removed Python cache"
    fi
else
    echo "No Python cache found"
fi
echo ""

# Remove .pyc files
remove_files "*.pyc" "Python compiled files"

# Summary
echo "📊 Summary"
echo "========="
if [ "$DRY_RUN" = "dry" ]; then
    echo "This was a DRY RUN. No files were deleted."
    echo "To delete these files, run: ./cleanup.sh delete"
else
    echo "Cleanup complete! Your project is tidier."
fi

echo ""
echo "💡 Next steps:"
echo "- Review important files before committing"
echo "- Update .gitignore to prevent these files in future"
echo "- Run 'git status' to see what changed"