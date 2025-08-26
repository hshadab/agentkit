#!/bin/bash

echo "🌊 Installing Solana CLI tools..."
echo "=================================="

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Configure for devnet
solana config set --url https://api.devnet.solana.com

# Check installation
echo -e "\n✅ Installation complete!"
solana --version

echo -e "\n📋 Current configuration:"
solana config get

echo -e "\n💡 To use Solana CLI in future sessions, add this to your .bashrc:"
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"'