#!/bin/bash
set -e

echo "=== Deploying ZK Verifier to Solana Devnet ==="

cd solana/simple-zk-verifier

# Build the program
echo "Building program..."
cargo build-sbf --manifest-path Cargo.toml

# Deploy to devnet
echo "Deploying to devnet..."
PROGRAM_ID=$(solana program deploy target/deploy/simple_zk_verifier.so --url devnet --keypair ~/.config/solana/id.json | grep "Program Id:" | cut -d' ' -f3)

echo "✅ Program deployed!"
echo "Program ID: $PROGRAM_ID"

# Update the program ID in our frontend
echo "Updating frontend with program ID..."
cat > solana/deployed-program.json << EOF
{
  "programId": "$PROGRAM_ID",
  "network": "devnet",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "Program info saved to solana/deployed-program.json"