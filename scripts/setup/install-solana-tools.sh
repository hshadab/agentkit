#!/bin/bash

# Solana Development Tools Installation Script
# This script installs everything needed to deploy Solana programs

echo "🚀 Installing Solana Development Tools..."

# 1. Install Rust (required for Solana programs)
if ! command -v rustc &> /dev/null; then
    echo "📦 Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "✅ Rust already installed"
fi

# 2. Install Solana CLI
echo "📦 Installing Solana CLI..."
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# 3. Install Anchor Framework
echo "📦 Installing Anchor Framework..."
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# 4. Configure Solana for Devnet
echo "⚙️ Configuring Solana for Devnet..."
solana config set --url https://api.devnet.solana.com

# 5. Create a new keypair
echo "🔑 Creating new keypair..."
solana-keygen new --no-passphrase --force

# 6. Get some devnet SOL
echo "💰 Requesting devnet SOL..."
solana airdrop 2

echo "✅ Installation complete!"
echo ""
echo "To complete setup, add these to your ~/.bashrc or ~/.zshrc:"
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"'
echo 'export PATH="$HOME/.cargo/bin:$PATH"'
echo ""
echo "Then run: source ~/.bashrc (or source ~/.zshrc)"