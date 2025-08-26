#!/usr/bin/env python3

import os
from pathlib import Path
from dotenv import load_dotenv
import config

# Load environment
load_dotenv()

# Check configuration
c = config.config
print("=== Current Configuration ===")
print(f"Working Directory: {Path.cwd()}")
print(f".env file exists: {(Path.cwd() / '.env').exists()}")
print()

print("OpenAI Configuration:")
print(f"  API Key: {'✓ Configured' if c.ai.openai_api_key and c.ai.openai_api_key != 'your_openai_api_key' else '✗ Not configured'}")
if c.ai.openai_api_key:
    print(f"  Key ends with: ...{c.ai.openai_api_key[-4:]}")
print()

print("Circle API Configuration:")
print(f"  API Key: {'✓ Configured' if c.circle.api_key and c.circle.api_key != 'your_circle_api_key_here' else '✗ Not configured'}")
print(f"  ETH Wallet ID: {c.circle.eth_wallet_id}")
print(f"  SOL Wallet ID: {c.circle.sol_wallet_id}")
print(f"  USDC Token ID: {c.circle.usdc_token_id}")
print()

print("zkEngine Configuration:")
print(f"  Binary Path: {c.zkengine.binary_path}")
print(f"  WASM Directory: {c.zkengine.wasm_dir}")
print(f"  Proofs Directory: {c.zkengine.proofs_dir}")
print()

print("Blockchain Configuration:")
print(f"  Ethereum:")
print(f"    Network: {c.blockchain.Ethereum.network}")
print(f"    Contract: {c.blockchain.Ethereum.contract_address}")
print(f"  Solana:")
print(f"    Network: {c.blockchain.Solana.network}")
print(f"    Program ID: {c.blockchain.Solana.program_id}")
print()

print("Server Configuration:")
print(f"  Main Port: {c.server.port}")
print(f"  Chat Service Port: {c.ai.chat_service_port}")
print()

# Check environment variables directly
print("=== Raw Environment Variables ===")
env_vars = [
    'OPENAI_API_KEY',
    'CIRCLE_API_KEY',
    'CIRCLE_ETH_WALLET_ID',
    'CIRCLE_SOL_WALLET_ID',
    'ZKENGINE_BINARY',
    'PORT'
]

for var in env_vars:
    value = os.getenv(var)
    if value:
        if 'KEY' in var or 'WALLET' in var:
            display = f"...{value[-8:]}" if len(value) > 8 else value
        else:
            display = value
        print(f"{var}: {display}")
    else:
        print(f"{var}: Not set")