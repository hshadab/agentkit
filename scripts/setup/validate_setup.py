#!/usr/bin/env python3
"""
Validation script to ensure all services have access to required configuration
"""

import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment
load_dotenv()

def check_service(name, checks):
    """Check if a service has required configuration"""
    print(f"\n🔍 Checking {name}...")
    all_good = True
    
    for check_name, check_func in checks.items():
        result, message = check_func()
        status = "✅" if result else "❌"
        print(f"  {status} {check_name}: {message}")
        if not result:
            all_good = False
    
    return all_good

def check_openai():
    """Check OpenAI configuration"""
    key = os.getenv('OPENAI_API_KEY')
    if key and key != 'your_openai_api_key_here' and key.startswith('sk-'):
        return True, f"Configured (ending in ...{key[-4:]})"
    return False, "Not configured or invalid"

def check_circle_api():
    """Check Circle API configuration"""
    key = os.getenv('CIRCLE_API_KEY')
    if key and key != 'your_circle_api_key_here':
        return True, f"Configured (ending in ...{key[-8:]})"
    return False, "Not configured"

def check_circle_wallets():
    """Check Circle wallet configuration"""
    eth = os.getenv('CIRCLE_ETH_WALLET_ID')
    sol = os.getenv('CIRCLE_SOL_WALLET_ID')
    
    if eth and eth != 'your_ethereum_wallet_id_here' and sol and sol != 'your_solana_wallet_id_here':
        return True, f"ETH: ...{eth[-8:]}, SOL: ...{sol[-8:]}"
    elif eth and eth != 'your_ethereum_wallet_id_here':
        return False, f"Only ETH configured: ...{eth[-8:]}"
    elif sol and sol != 'your_solana_wallet_id_here':
        return False, f"Only SOL configured: ...{sol[-8:]}"
    return False, "Neither wallet configured"

def check_zkengine():
    """Check zkEngine binary"""
    path = os.getenv('ZKENGINE_BINARY', './zkengine_binary/zkEngine')
    if Path(path).exists():
        return True, f"Found at {path}"
    return False, f"Not found at {path}"

def check_wasm_files():
    """Check WASM files"""
    wasm_dir = os.getenv('WASM_DIR', './zkengine_binary')
    wasm_files = ['kyc_compliance_real.wasm', 'depin_location_real.wasm', 'ai_content_verification_real.wasm']
    
    found = []
    for wasm in wasm_files:
        if (Path(wasm_dir) / wasm).exists():
            found.append(wasm.replace('_real.wasm', ''))
    
    if len(found) == len(wasm_files):
        return True, f"All {len(wasm_files)} WASM files found"
    elif found:
        return False, f"Only found: {', '.join(found)}"
    return False, f"No WASM files found in {wasm_dir}"

def check_rust_server():
    """Check if Rust server can be built"""
    cargo_toml = Path.cwd() / 'Cargo.toml'
    if cargo_toml.exists():
        return True, "Cargo.toml found"
    return False, "Cargo.toml not found"

def check_ports():
    """Check if required ports are available"""
    import socket
    
    ports = {
        'Rust WebSocket': int(os.getenv('PORT', 8001)),
        'Python Chat Service': int(os.getenv('CHAT_SERVICE_PORT', 8002))
    }
    
    blocked = []
    for service, port in ports.items():
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        if result == 0:
            blocked.append(f"{service} ({port})")
    
    if blocked:
        return False, f"Ports in use: {', '.join(blocked)}"
    return True, f"All ports available"

def main():
    print("🔧 Verifiable Agent Kit - Setup Validation")
    print("=" * 60)
    
    all_good = True
    
    # Check each service
    all_good &= check_service("AI Service (Chat/Workflow)", {
        "OpenAI API Key": check_openai,
    })
    
    all_good &= check_service("Circle API (USDC Transfers)", {
        "API Key": check_circle_api,
        "Wallet IDs": check_circle_wallets,
    })
    
    all_good &= check_service("zkEngine (Proof Generation)", {
        "Binary": check_zkengine,
        "WASM Files": check_wasm_files,
    })
    
    all_good &= check_service("Server Infrastructure", {
        "Rust Project": check_rust_server,
        "Port Availability": check_ports,
    })
    
    # Summary
    print("\n" + "=" * 60)
    if all_good:
        print("✅ All systems configured correctly!")
        print("\n🚀 Ready to start:")
        print("  Terminal 1: cargo run")
        print("  Terminal 2: python chat_service.py")
    else:
        print("❌ Some configuration is missing.")
        print("\n🔧 To fix:")
        print("  Run: python setup_complete.py")
        print("\nFor specific issues:")
        print("  - OpenAI: python setup_openai.py")
        print("  - Full setup: python setup_complete.py")
    
    return 0 if all_good else 1

if __name__ == '__main__':
    sys.exit(main())