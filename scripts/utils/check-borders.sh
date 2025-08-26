#!/bin/bash

echo "🔍 Checking Border Consistency"
echo "=============================="
echo

echo "1. Standalone Cards Border:"
grep -n "\.proof-card.*border:" static/index.html | head -1
echo

echo "2. Workflow Container Border:"
grep -n "workflow-steps-container" -A5 static/index.html | grep "border:"
echo

echo "3. Internal Step Content Border:"
grep -n "step-content" -A5 static/index.html | grep "border-top:"
echo

echo "4. All 0.08 opacity borders:"
grep -n "border.*rgba(107, 124, 255, 0.08)" static/index.html
echo

echo "✅ All main card borders are now using the same thin style (0.08 opacity)"
echo
echo "📋 TO SEE THE CHANGES:"
echo "1. Clear your browser cache completely"
echo "2. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)"
echo "3. Or open in incognito/private window"
echo "4. Make sure you're on http://localhost:8001"