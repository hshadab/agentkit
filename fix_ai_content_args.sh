#!/bin/bash
# fix_ai_content_args.sh - Fix AI content arguments to use integers

set -e

echo "🔧 Fixing AI content arguments to use integers instead of strings..."

cd ~/agentkit

# Create backup
cp langchain_service.py langchain_service.py.args_backup

# Fix the arguments using Python
python3 << 'EOF'
import re

with open('langchain_service.py', 'r') as f:
    content = f.read()

# Find and replace the AI content default arguments
old_args = '''                    if func == 'prove_ai_content':
                        args = ["default_content", "authenticity_check"]'''

new_args = '''                    if func == 'prove_ai_content':
                        args = ["42", "1"]  # content_hash=42, auth_type=1'''

content = content.replace(old_args, new_args)

# Also update the complexity analyzer description
old_desc = '''f"AI content authenticity proof with verification method: {args[1] if len(args) > 1 else 'default'}."'''
new_desc = '''f"AI content authenticity proof with content_hash: {args[0] if len(args) > 0 else '42'}, auth_type: {args[1] if len(args) > 1 else '1'}."'''

content = content.replace(old_desc, new_desc)

# Update the system prompt explanation
old_explanation = '''1. prove_ai_content(content_type, verification_method) - Prove AI-generated content authenticity and integrity'''
new_explanation = '''1. prove_ai_content(content_hash, auth_type) - Prove AI-generated content authenticity and integrity (content_hash: numeric ID, auth_type: 1=signature, 2=hash, 3=full)'''

content = content.replace(old_explanation, new_explanation)

# Write the updated file
with open('langchain_service.py', 'w') as f:
    f.write(content)

print("✅ Updated AI content arguments to use integers")
print("📝 Changes:")
print("  - default_content -> 42 (content hash)")
print("  - authenticity_check -> 1 (auth type)")
EOF

# Kill existing processes
echo "🔄 Restarting services..."
sudo lsof -ti:8002 | xargs kill -9 2>/dev/null || true
sudo lsof -ti:8001 | xargs kill -9 2>/dev/null || true

# Wait a moment
sleep 2

# Set environment and restart
export WASM_DIR=~/agentkit/zkengine/example_wasms
export ZKENGINE_BINARY=~/agentkit/zkengine/zkEngine_dev/wasm_file

# Start Rust backend
echo "🚀 Starting Rust backend..."
cargo run &
RUST_PID=$!

# Start Python service
echo "🐍 Starting Python service..."
source langchain_env/bin/activate && python langchain_service.py &
PYTHON_PID=$!

# Wait for services to start
sleep 5

echo ""
echo "🎉 Fix applied! Services restarted."
echo ""
echo "📋 AI Content Proof now uses:"
echo "  - Argument 1: 42 (content hash ID)"  
echo "  - Argument 2: 1 (authentication type)"
echo ""
echo "🧪 Test with: 'prove ai content authenticity'"
echo "📱 Access: http://localhost:8001"
echo ""
echo "💡 The AI content proof will now use integer arguments that zkEngine can parse!"
echo ""
echo "🔍 If you want to see what changed:"
echo "   diff langchain_service.py.args_backup langchain_service.py"
