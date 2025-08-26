#!/usr/bin/env python3
"""
Complete setup script for Verifiable Agent Kit
Handles all configuration including Circle API, wallets, and paths
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv, set_key

def load_current_config():
    """Load and display current configuration"""
    env_path = Path.cwd() / '.env'
    if env_path.exists():
        load_dotenv(env_path)
    
    print("\n📋 Current Configuration Status:")
    print("=" * 50)
    
    configs = {
        "OpenAI API Key": os.getenv('OPENAI_API_KEY', ''),
        "Circle API Key": os.getenv('CIRCLE_API_KEY', ''),
        "Circle ETH Wallet ID": os.getenv('CIRCLE_ETH_WALLET_ID', ''),
        "Circle SOL Wallet ID": os.getenv('CIRCLE_SOL_WALLET_ID', ''),
        "zkEngine Binary": os.getenv('ZKENGINE_BINARY', './zkengine_binary/zkEngine'),
    }
    
    for key, value in configs.items():
        if value and not value.startswith('your_'):
            if 'Key' in key or 'Wallet' in key:
                status = f"✓ Configured (...{value[-8:]})"
            else:
                status = f"✓ {value}"
        else:
            status = "✗ Not configured"
        print(f"{key}: {status}")
    
    return configs

def update_env_file(updates):
    """Update .env file with new values"""
    env_path = Path.cwd() / '.env'
    
    # Create if doesn't exist
    if not env_path.exists():
        example_path = Path.cwd() / '.env.example'
        if example_path.exists():
            with open(example_path, 'r') as f:
                content = f.read()
            with open(env_path, 'w') as f:
                f.write(content)
    
    # Update each value
    for key, value in updates.items():
        set_key(env_path, key, value)
    
    print(f"\n✅ Updated {env_path}")

def main():
    print("🔧 Verifiable Agent Kit - Complete Setup")
    print("=" * 50)
    
    # Show current config
    current = load_current_config()
    
    print("\n🔄 Configuration Options:")
    print("1. Configure Circle API (USDC transfers)")
    print("2. Update zkEngine binary path")
    print("3. Configure OpenAI API key")
    print("4. Show current configuration")
    print("5. Exit")
    
    while True:
        choice = input("\nSelect option (1-5): ").strip()
        
        if choice == '1':
            print("\n🏦 Circle API Configuration")
            print("-" * 30)
            print("Circle API enables real USDC transfers on Ethereum and Solana")
            print("Get your API credentials from: https://app.circle.com/")
            
            updates = {}
            
            # Circle API Key
            api_key = input("\nCircle API Key (or press Enter to skip): ").strip()
            if api_key and api_key != current.get('Circle API Key', ''):
                updates['CIRCLE_API_KEY'] = api_key
            
            # ETH Wallet ID
            eth_wallet = input("Circle Ethereum Wallet ID (or press Enter to skip): ").strip()
            if eth_wallet and eth_wallet != current.get('Circle ETH Wallet ID', ''):
                updates['CIRCLE_ETH_WALLET_ID'] = eth_wallet
            
            # SOL Wallet ID
            sol_wallet = input("Circle Solana Wallet ID (or press Enter to skip): ").strip()
            if sol_wallet and sol_wallet != current.get('Circle SOL Wallet ID', ''):
                updates['CIRCLE_SOL_WALLET_ID'] = sol_wallet
            
            if updates:
                update_env_file(updates)
                print("✅ Circle API configuration updated!")
            else:
                print("No changes made.")
        
        elif choice == '2':
            print("\n⚙️  zkEngine Binary Path Configuration")
            print("-" * 30)
            print(f"Current path: {current.get('zkEngine Binary', 'Not set')}")
            
            # Check common locations
            possible_paths = [
                Path.home() / 'agentic' / 'zkEngine_dev' / 'wasm_file',
                Path.cwd() / 'zkengine_binary' / 'zkEngine',
                Path.home() / 'zkEngine' / 'zkEngine',
            ]
            
            print("\nFound zkEngine in these locations:")
            valid_paths = []
            for i, path in enumerate(possible_paths):
                if path.exists():
                    print(f"{i+1}. {path}")
                    valid_paths.append(path)
            
            if valid_paths:
                print(f"{len(valid_paths)+1}. Enter custom path")
                selection = input(f"\nSelect option (1-{len(valid_paths)+1}): ").strip()
                
                try:
                    idx = int(selection) - 1
                    if 0 <= idx < len(valid_paths):
                        update_env_file({'ZKENGINE_BINARY': str(valid_paths[idx])})
                        print(f"✅ zkEngine path updated to: {valid_paths[idx]}")
                    else:
                        custom_path = input("Enter zkEngine binary path: ").strip()
                        if custom_path:
                            update_env_file({'ZKENGINE_BINARY': custom_path})
                            print(f"✅ zkEngine path updated to: {custom_path}")
                except:
                    print("Invalid selection")
            else:
                custom_path = input("Enter zkEngine binary path: ").strip()
                if custom_path:
                    update_env_file({'ZKENGINE_BINARY': custom_path})
                    print(f"✅ zkEngine path updated to: {custom_path}")
        
        elif choice == '3':
            print("\n🤖 OpenAI API Key Configuration")
            print("-" * 30)
            
            # Import and run the OpenAI setup
            try:
                import setup_openai
                setup_openai.main()
            except Exception as e:
                print(f"Error running OpenAI setup: {e}")
                api_key = input("Enter OpenAI API key: ").strip()
                if api_key and api_key.startswith('sk-'):
                    update_env_file({'OPENAI_API_KEY': api_key})
                    print("✅ OpenAI API key updated!")
        
        elif choice == '4':
            current = load_current_config()
        
        elif choice == '5':
            print("\n👋 Setup complete!")
            break
        
        else:
            print("Invalid option. Please select 1-5.")
    
    # Show final configuration
    print("\n📋 Final Configuration:")
    print("=" * 50)
    load_current_config()
    
    print("\n🚀 To start the services:")
    print("  Terminal 1: cargo run")
    print("  Terminal 2: python chat_service.py")

if __name__ == '__main__':
    main()