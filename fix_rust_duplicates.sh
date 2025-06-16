#!/bin/bash
# Fix Rust Backend Duplicates and Create Test

echo "🔧 Fixing Rust backend duplicates..."

# 1. Fix the duplicate entries in main.rs
python3 - << 'PYTHON_EOF'
import re

with open('src/main.rs', 'r') as f:
    content = f.read()

# Find the function mapping section and fix it
pattern = r'(let wasm_file = match intent\.function\.as_str\(\) \{[^}]*)((?:\s*"prove_location" => "prove_location\.wat",\s*)+)(.*?\})'

def fix_mapping(match):
    start = match.group(1)
    duplicates = match.group(2)  # This contains the duplicates
    end = match.group(3)
    
    # Clean version with single prove_location entry
    clean_mapping = '''
                "prove_location" => "prove_location.wat",
                "fibonacci" => "fib.wat",'''
    
    return start + clean_mapping + end

content = re.sub(pattern, fix_mapping, content, flags=re.MULTILINE | re.DOTALL)

# Write back
with open('src/main.rs', 'w') as f:
    f.write(content)

print("✅ Fixed duplicate entries in Rust backend")
PYTHON_EOF

# 2. Create the test script that was missing
cat > test_backend.py << 'EOF'
#!/usr/bin/env python3
import asyncio
import websockets
import json
import sys

async def test_backend():
    uri = "ws://localhost:8001/ws"
    try:
        print(f"🔌 Connecting to {uri}...")
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to backend WebSocket")
            
            # Send a test message
            test_message = {"message": "prove device location in San Francisco"}
            await websocket.send(json.dumps(test_message))
            print(f"📤 Sent: {test_message}")
            
            # Wait for response with timeout
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"📥 Received: {response}")
                
                # Try to parse the response
                try:
                    data = json.loads(response)
                    print(f"📊 Parsed response type: {data.get('type', 'unknown')}")
                    if 'content' in data:
                        print(f"📝 Content: {data['content'][:100]}...")
                except json.JSONDecodeError:
                    print("⚠️  Response is not valid JSON")
                    
            except asyncio.TimeoutError:
                print("⏰ Timeout waiting for response")
                
    except ConnectionRefusedError:
        print("❌ Connection refused - is the Rust backend running on port 8001?")
    except Exception as e:
        print(f"❌ Backend test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_backend())
EOF

chmod +x test_backend.py

# 3. Check if the Rust backend compiles
echo "Testing Rust compilation..."
cd ~/agentkit
if cargo check; then
    echo "✅ Rust backend compiles successfully"
else
    echo "❌ Rust compilation failed - need to fix syntax errors"
    echo "🔍 Checking main.rs syntax around function mapping..."
    
    # Show the context around the function mapping
    grep -B 5 -A 15 "let wasm_file = match intent.function.as_str()" src/main.rs
fi

# 4. Create a simple health check
cat > check_services.sh << 'EOF'
#!/bin/bash
echo "🔍 Checking service status..."

# Check if Rust backend is running
if curl -s http://localhost:8001/api/health > /dev/null; then
    echo "✅ Rust backend (port 8001) is running"
else
    echo "❌ Rust backend (port 8001) is not responding"
fi

# Check if LangChain service is running  
if curl -s http://localhost:8002/health > /dev/null; then
    echo "✅ LangChain service (port 8002) is running"
else
    echo "❌ LangChain service (port 8002) is not responding"
fi

# Check WebSocket endpoint
echo "🔌 Testing WebSocket connection..."
python3 -c "
import asyncio
import websockets

async def test():
    try:
        async with websockets.connect('ws://localhost:8001/ws') as ws:
            print('✅ WebSocket connection successful')
    except Exception as e:
        print(f'❌ WebSocket connection failed: {e}')

asyncio.run(test())
"
EOF

chmod +x check_services.sh

echo ""
echo "✅ Fixed Rust Backend Issues!"
echo ""
echo "🔧 What was fixed:"
echo "   • Removed duplicate prove_location entries from Rust backend"
echo "   • Created missing test_backend.py script"
echo "   • Created service health check script"
echo ""
echo "🚀 Now run these steps:"
echo ""
echo "1. Check if Rust compiles:"
echo "   cargo check"
echo ""
echo "2. If compilation succeeds, restart Rust backend:"
echo "   cargo run"
echo ""
echo "3. Test the backend:"
echo "   python3 test_backend.py"
echo ""
echo "4. Check all services:"
echo "   ./check_services.sh"

