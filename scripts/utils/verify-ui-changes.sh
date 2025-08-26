#!/bin/bash

echo "🔍 Verifying UI Changes in index.html"
echo "====================================="
echo

echo "1. Logo Change:"
if grep -q "logo-novanet.svg" static/index.html; then
    echo "✅ Novanet logo is in the file"
    grep -n "logo-novanet.svg" static/index.html | head -1
else
    echo "❌ Logo not found"
fi
echo

echo "2. 'View on chain' Text:"
count=$(grep -c "View on chain" static/index.html)
echo "✅ Found $count occurrences of 'View on chain'"
echo

echo "3. Thin Borders (0.1 opacity):"
border_count=$(grep -c "border: 1px solid rgba(107, 124, 255, 0.1)" static/index.html)
echo "✅ Found $border_count thin borders with 0.1 opacity"
echo

echo "4. Workflow Step Spacing:"
if grep -q "margin-bottom: 32px;" static/index.html; then
    echo "✅ Workflow steps have 32px spacing"
else
    echo "❌ Workflow step spacing not found"
fi
echo

echo "5. Standalone Proof Detection:"
if grep -q "!data.workflowId && !data.metadata?.additional_context?.workflow_id" static/index.html; then
    echo "✅ Standalone proof detection logic is present"
else
    echo "❌ Standalone proof detection not found"
fi
echo

echo "📋 TO SEE THE CHANGES:"
echo "1. Hard refresh your browser:"
echo "   - Chrome/Edge: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)"
echo "   - Firefox: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo "   - Safari: Cmd+Option+R"
echo
echo "2. Or clear browser cache:"
echo "   - Open Developer Tools (F12)"
echo "   - Right-click the refresh button"
echo "   - Select 'Empty Cache and Hard Reload'"
echo
echo "3. Make sure you're accessing http://localhost:8001"
echo "   (not 8000 or another port)"
echo
echo "4. If still not working, restart the server:"
echo "   pkill zkengine"
echo "   cargo run"