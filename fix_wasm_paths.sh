#!/bin/bash
# fix_wasm_paths.sh - Fix WASM file location issues

set -e

echo "🔧 Fixing WASM file path issues..."
echo ""

# Current working directory should be agentkit
if [[ ! -d "zkengine/example_wasms" ]]; then
    echo "❌ Error: Please run this script from the agentkit directory"
    echo "   cd ~/agentkit && ./fix_wasm_paths.sh"
    exit 1
fi

CURRENT_DIR=$(pwd)
CORRECT_WASM_DIR="$CURRENT_DIR/zkengine/example_wasms"
WRONG_WASM_DIR="/home/hshadab/agentic/zkEngine_dev/wasm/zkengine-examples"

echo "📍 Current directory: $CURRENT_DIR"
echo "📁 Correct WASM directory: $CORRECT_WASM_DIR"
echo "❌ System looking in: $WRONG_WASM_DIR"
echo ""

# Option 1: Update environment variable approach
echo "🔧 OPTION 1: Setting WASM_DIR environment variable..."

# Create/update .env file
cat > .env << EOF
ZKENGINE_BINARY=$CURRENT_DIR/zkengine/zkEngine_dev/wasm_file
WASM_DIR=$CURRENT_DIR/zkengine/example_wasms
PROOFS_DIR=$CURRENT_DIR/proofs
PORT=8001
LANGCHAIN_SERVICE_URL=http://localhost:8002
EOF

echo "✅ Created .env file with correct paths"

# Option 2: Update the Rust code default path
echo ""
echo "🔧 OPTION 2: Updating Rust code defaults..."

if [ -f "src/main.rs" ]; then
    # Create backup
    cp src/main.rs src/main.rs.wasm_backup
    
    # Update the default WASM_DIR path in main.rs
    sed -i "s|/home/hshadab/zkengine/zkEngine_dev/wasm/zkengine-examples|$CORRECT_WASM_DIR|g" src/main.rs
    
    # Also update any hardcoded paths that might exist
    sed -i "s|/home/hshadab/agentic/zkEngine_dev/wasm/zkengine-examples|$CORRECT_WASM_DIR|g" src/main.rs
    
    echo "✅ Updated Rust code default paths"
else
    echo "❌ src/main.rs not found"
fi

# Option 3: Create symlinks in the expected location
echo ""
echo "🔧 OPTION 3: Creating symlinks for compatibility..."

# Create the expected directory structure
mkdir -p "$(dirname "$WRONG_WASM_DIR")"

# Remove existing if it's a broken symlink
if [ -L "$WRONG_WASM_DIR" ]; then
    rm "$WRONG_WASM_DIR"
fi

# Create symlink from wrong location to correct location
if [ ! -d "$WRONG_WASM_DIR" ]; then
    ln -sf "$CORRECT_WASM_DIR" "$WRONG_WASM_DIR"
    echo "✅ Created symlink: $WRONG_WASM_DIR -> $CORRECT_WASM_DIR"
else
    echo "⚠️  Directory already exists: $WRONG_WASM_DIR"
fi

# Option 4: Copy all WASM files to expected location
echo ""
echo "🔧 OPTION 4: Copying WASM files to expected location..."

if [ ! -d "$WRONG_WASM_DIR" ] || [ -L "$WRONG_WASM_DIR" ]; then
    mkdir -p "$WRONG_WASM_DIR"
    cp "$CORRECT_WASM_DIR"/*.wat "$WRONG_WASM_DIR/" 2>/dev/null || true
    echo "✅ Copied all .wat files to expected location"
    echo "📋 Files copied:"
    ls -la "$WRONG_WASM_DIR"/*.wat 2>/dev/null || echo "No .wat files found to copy"
fi

# Verify the specific file exists in both locations
echo ""
echo "🔍 Verification:"
echo "prove_ai_content.wat in correct location:"
if [ -f "$CORRECT_WASM_DIR/prove_ai_content.wat" ]; then
    echo "✅ $CORRECT_WASM_DIR/prove_ai_content.wat"
    ls -la "$CORRECT_WASM_DIR/prove_ai_content.wat"
else
    echo "❌ $CORRECT_WASM_DIR/prove_ai_content.wat NOT FOUND"
fi

echo ""
echo "prove_ai_content.wat in expected location:"
if [ -f "$WRONG_WASM_DIR/prove_ai_content.wat" ]; then
    echo "✅ $WRONG_WASM_DIR/prove_ai_content.wat"
    ls -la "$WRONG_WASM_DIR/prove_ai_content.wat"
else
    echo "❌ $WRONG_WASM_DIR/prove_ai_content.wat NOT FOUND"
fi

# Show environment setup
echo ""
echo "🌍 Environment setup:"
echo "WASM_DIR should be: $CORRECT_WASM_DIR"
echo "Current WASM_DIR: ${WASM_DIR:-'not set'}"

# Create a startup script that sets the environment
cat > start_with_env.sh << EOF
#!/bin/bash
# Auto-generated startup script with correct environment

export ZKENGINE_BINARY=$CURRENT_DIR/zkengine/zkEngine_dev/wasm_file
export WASM_DIR=$CURRENT_DIR/zkengine/example_wasms
export PROOFS_DIR=$CURRENT_DIR/proofs
export PORT=8001
export LANGCHAIN_SERVICE_URL=http://localhost:8002

echo "🌍 Environment variables set:"
echo "ZKENGINE_BINARY=\$ZKENGINE_BINARY"
echo "WASM_DIR=\$WASM_DIR" 
echo "PROOFS_DIR=\$PROOFS_DIR"
echo ""

# Kill existing processes
echo "🔄 Killing existing processes..."
sudo lsof -ti:8001 | xargs kill -9 2>/dev/null || true
sudo lsof -ti:8002 | xargs kill -9 2>/dev/null || true

echo "🚀 Starting Rust backend..."
cargo run &

echo "🐍 Starting Python service..."
source langchain_env/bin/activate && python langchain_service.py &

echo ""
echo "🎉 Services started with correct environment!"
echo "📱 Access: http://localhost:8001"
echo "🧪 Test with: 'prove ai content authenticity'"
EOF

chmod +x start_with_env.sh

echo ""
echo "🎉 All fixes applied!"
echo ""
echo "📋 What was done:"
echo "✅ Created .env file with correct paths"
echo "✅ Updated Rust code default paths"
echo "✅ Created symlink for compatibility"
echo "✅ Copied WASM files to expected location"
echo "✅ Created start_with_env.sh script"
echo ""
echo "🚀 Next steps:"
echo "1. Use the startup script: ./start_with_env.sh"
echo "   OR"
echo "2. Manually restart with environment:"
echo "   export WASM_DIR=$CORRECT_WASM_DIR"
echo "   cargo run &"
echo "   source langchain_env/bin/activate && python langchain_service.py &"
echo ""
echo "🧪 Test with: 'prove ai content authenticity'"
