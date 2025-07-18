#!/usr/bin/env python3
"""
Check Circle integration setup status
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment
load_dotenv()

print("🔍 Circle Integration Status Check")
print("=" * 50)

# Check API Key
api_key = os.getenv('CIRCLE_API_KEY', '')
if api_key and api_key.startswith('SAND_API_KEY:'):
    print("✅ Circle API Key: Configured (Sandbox)")
else:
    print("❌ Circle API Key: Not configured")

# Check Wallet IDs
eth_wallet = os.getenv('CIRCLE_ETH_WALLET_ID', '')
sol_wallet = os.getenv('CIRCLE_SOL_WALLET_ID', '')

print("\n📦 Wallet Configuration:")
if eth_wallet and eth_wallet != 'your_ethereum_wallet_id_here':
    print(f"  ETH Wallet ID: {eth_wallet}")
    if eth_wallet == '1017339334':
        print("  ⚠️  WARNING: This is a merchant wallet, not a blockchain wallet!")
else:
    print("  ❌ ETH Wallet ID: Not configured")
    
if sol_wallet and sol_wallet != 'your_solana_wallet_id_here':
    print(f"  SOL Wallet ID: {sol_wallet}")
    if sol_wallet == '1017339334':
        print("  ⚠️  WARNING: This is a merchant wallet, not a blockchain wallet!")
else:
    print("  ❌ SOL Wallet ID: Not configured")

print("\n📋 Required Actions:")
if eth_wallet == 'your_ethereum_wallet_id_here' or sol_wallet == 'your_solana_wallet_id_here':
    print("1. Go to https://app-sandbox.circle.com/")
    print("2. Create blockchain wallets for Ethereum and Solana")
    print("3. Update .env file with the wallet IDs")
    print("4. Run 'node circle/find-blockchain-wallets.js' to verify")

print("\n💡 Current Status:")
if api_key and eth_wallet == 'your_ethereum_wallet_id_here':
    print("- API key is configured ✅")
    print("- Blockchain wallets need to be created ❌")
    print("- USDC transfers will NOT work until wallets are created")
    print("- Proof generation and verification WILL work ✅")
else:
    print("- System is ready for all operations ✅")

print("\n📚 Documentation:")
print("- Setup Guide: CIRCLE_WALLET_SETUP.md")
print("- Example Addresses: circle/recipientResolver.js")
print("  - alice (ETH): 0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
print("  - bob (ETH): 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC")