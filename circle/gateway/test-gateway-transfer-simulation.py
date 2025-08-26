#!/usr/bin/env python3
"""
Simulate Gateway transfer with current balance state to see what would happen
"""
import requests
import json

def simulate_gateway_transfer():
    print("🧪 Simulating Gateway Transfer with Current Balance State")
    print("=" * 70)
    
    # Configuration
    api_key = "SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838"
    base_url = "https://gateway-api-testnet.circle.com/v1"
    user_address = "0xE616B2eC620621797030E0AB1BA38DA68D78351C"
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    
    # First, check current balance
    print("📊 Current Balance Check:")
    print("-" * 40)
    
    balance_payload = {
        "token": "USDC",
        "sources": [
            {"domain": 0, "depositor": user_address}  # Ethereum Sepolia
        ]
    }
    
    try:
        response = requests.post(f"{base_url}/balances", headers=headers, json=balance_payload)
        balance_data = response.json()
        
        sepolia_balance = balance_data.get("balances", [{}])[0]
        deposited = float(sepolia_balance.get("balance", 0))
        available = float(sepolia_balance.get("available", 0))
        
        print(f"💰 Sepolia Balance:")
        print(f"   Deposited: {deposited:.6f} USDC")
        print(f"   Available: {available:.6f} USDC")
        
        # Now simulate a transfer attempt
        print(f"\n🔄 Simulating 0.01 USDC Transfer:")
        print("-" * 40)
        
        if available == 0:
            print("⚠️  API shows 0 available balance")
            print("   Question: Will transfer still work?")
            print("   Circle's API might be wrong about availability")
        
        # Create transfer payload (what would be sent)
        transfer_payload = {
            "source": {"domain": 0, "depositor": user_address},
            "destination": {"domain": 6, "recipient": user_address},  # Sepolia to Base
            "amount": "10000",  # 0.01 USDC in micro-units
            "token": "USDC",
            "maxFee": "2000000"  # 2.0 USDC max fee
        }
        
        print(f"📋 Transfer Payload:")
        print(json.dumps(transfer_payload, indent=2))
        
        print(f"\n🎯 Prediction:")
        if available > 0:
            print("✅ Should work - available balance exists")
        elif deposited > 0:
            print("❓ Might work - funds are deposited, API might be wrong")
            print("   Blockchain has the funds, Circle's API might be buggy")
        else:
            print("❌ Will fail - no funds at all")
            
        print(f"\n🧪 Would you like to try this transfer?")
        print("   - Go to your main Gateway workflow")  
        print("   - Try 0.01 USDC Sepolia → Base transfer")
        print("   - See if it works despite 0 'available' balance")
        
        return {
            "deposited": deposited,
            "available": available,
            "recommendation": "try_transfer" if deposited > 0 else "need_funds"
        }
        
    except Exception as e:
        print(f"❌ Balance check failed: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    result = simulate_gateway_transfer()
    print(f"\n🎯 Simulation Result: {result}")