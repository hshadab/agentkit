#!/bin/bash

# Force cache clear by updating all version numbers
echo "🔄 Forcing cache clear..."

# Generate new timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Update main.js import in index.html
sed -i "s/main\.js?v=[^\"']*/main.js?v=$TIMESTAMP/g" /home/hshadab/agentkit/static/index.html

# Update gateway-workflow-manager import in main.js
sed -i "s/gateway-workflow-manager-v2\.js?v=[^']*/gateway-workflow-manager-v2.js?v=$TIMESTAMP/g" /home/hshadab/agentkit/static/js/main.js

echo "✅ Updated cache versions to: $TIMESTAMP"
echo ""
echo "🔄 Restarting web server..."

# Kill old server
pkill -f "python.*8080" 2>/dev/null

sleep 1

# Start new server
cd /home/hshadab/agentkit/static
python3 -m http.server 8080 --bind 0.0.0.0 &

echo "✅ Web server restarted on port 8080"
echo ""
echo "📝 Instructions:"
echo "1. Open browser DevTools (F12)"
echo "2. Go to Network tab"  
echo "3. Check 'Disable cache' checkbox"
echo "4. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo "5. Check console for: '🔑 Programmatic signing enabled for Gateway workflows'"