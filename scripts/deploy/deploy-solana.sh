#!/bin/bash

# Solana Program Deployment Script
# Deploy the Nova Verifier to Solana Devnet

echo "🚀 Deploying Nova Verifier to Solana Devnet..."

# Check if tools are installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please run ./install-solana-tools.sh first"
    exit 1
fi

if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor not found. Please run ./install-solana-tools.sh first"
    exit 1
fi

# Navigate to Solana program directory
cd solana/programs/nova_verifier

# Build the program
echo "📦 Building program..."
anchor build

# Get the program ID
PROGRAM_ID=$(solana address -k target/deploy/nova_verifier-keypair.json)
echo "📍 Program ID: $PROGRAM_ID"

# Update program ID in lib.rs
echo "📝 Updating program ID..."
sed -i "s/NovaZKVerify11111111111111111111111111111111/$PROGRAM_ID/" src/lib.rs

# Rebuild with correct ID
anchor build

# Deploy to devnet
echo "🌐 Deploying to devnet..."
anchor deploy --provider.cluster devnet

# Update frontend configuration
echo "📝 Updating frontend configuration..."
cat > ../../solana-deployed.json <<EOF
{
  "programId": "$PROGRAM_ID",
  "network": "devnet",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "explorerUrl": "https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
}
EOF

# Update solana-verifier.js
sed -i "s|this.programId = .*|this.programId = new solanaWeb3.PublicKey('$PROGRAM_ID');|" ../../static/solana-verifier.js

echo "✅ Deployment complete!"
echo ""
echo "🔗 Program deployed at: $PROGRAM_ID"
echo "🌐 View on Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "Next steps:"
echo "1. The frontend has been automatically updated with your program ID"
echo "2. Make sure you have devnet SOL (run: solana airdrop 2)"
echo "3. Test the verification flow in the UI"