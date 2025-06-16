#!/bin/bash
cd ~/agentkit

# Check for backup
if [ -f "static/index.html.backup" ]; then
    cp static/index.html.backup static/index.html
    echo "✅ Restored from backup!"
else
    echo "❌ No backup found. Restoring original..."
    # Since we can't paste the full HTML here, you need to restore from paste-2.txt
    echo "Please copy the content from paste-2.txt to static/index.html"
fi
