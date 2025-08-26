#!/bin/bash

echo "🚀 Deploying Solana Groth16 Verifier to Devnet"
echo "=============================================="

# Your wallet address
WALLET="A6mKVjHuha3UUcPYKH2YWW7yXBd5Zs1SUwtqmJgY44pL"

# Add Solana to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Configure for devnet
echo "📍 Configuring Solana CLI for devnet..."
solana config set --url https://api.devnet.solana.com

# Check balance
echo -e "\n💰 Checking wallet balance..."
solana balance $WALLET

# Request airdrop if needed
echo -e "\n💧 Requesting devnet SOL airdrop..."
solana airdrop 2 $WALLET || echo "Airdrop failed (rate limited or sufficient balance)"

# Check balance again
echo -e "\n💰 Updated balance:"
solana balance $WALLET

# Build the simple verifier
echo -e "\n🔨 Building the program..."
cd /home/hshadab/agentkit

# Create a simple program directory if it doesn't exist
mkdir -p solana-verifier-simple/src

# Copy the simple verifier code
cp solana-simple-verifier.rs solana-verifier-simple/src/lib.rs

# Create Cargo.toml
cat > solana-verifier-simple/Cargo.toml << 'EOF'
[package]
name = "zkengine-verifier"
version = "0.1.0"
edition = "2021"

[dependencies]
solana-program = "1.17.0"
borsh = "0.10.3"

[lib]
crate-type = ["cdylib", "lib"]
name = "zkengine_verifier"

[features]
no-entrypoint = []
EOF

# Build the program
cd solana-verifier-simple
cargo build-sbf --sbf-out-dir=../target/deploy

cd ..

# Generate program keypair
echo -e "\n🔑 Generating program keypair..."
solana-keygen new -o program-keypair.json --force --no-bip39-passphrase

# Get the program ID
PROGRAM_ID=$(solana-keygen pubkey program-keypair.json)
echo "📋 Program ID will be: $PROGRAM_ID"

# Deploy the program
echo -e "\n🚀 Deploying program..."
solana program deploy target/deploy/zkengine_verifier.so \
  --program-id program-keypair.json \
  --keypair $HOME/.config/solana/id.json \
  --with-compute-unit-price 1

# Show deployment info
echo -e "\n✅ Deployment complete!"
echo "Program ID: $PROGRAM_ID"
echo -e "\nNext steps:"
echo "1. Update static/solana-verifier.js with program ID: $PROGRAM_ID"
echo "2. Test verification with all 3 proof types"

# Save program ID to file
echo $PROGRAM_ID > deployed-program-id.txt
echo -e "\nProgram ID saved to: deployed-program-id.txt"