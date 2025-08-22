#!/usr/bin/env python3
"""
Fix Gateway deposits to make funds available for transfers
"""
import requests
import json

def investigate_gateway_deposits():
    print("🔧 Investigating Gateway Deposit Methods")
    print("=" * 60)
    
    api_key = "SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838"
    base_url = "https://gateway-api-testnet.circle.com/v1"
    user_address = "0xE616B2eC620621797030E0AB1BA38DA68D78351C"
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    
    print("🔍 PROBLEM ANALYSIS:")
    print("Current state: 6.00 USDC deposited, 0.00 USDC available")
    print("Root cause: Funds deposited incorrectly or not activated")
    print()
    
    # Check available API endpoints
    print("📡 Available API Endpoints:")
    endpoints_to_check = [
        "/balances",
        "/deposits", 
        "/transfer",
        "/activate",
        "/unlock"
    ]
    
    for endpoint in endpoints_to_check:
        try:
            response = requests.get(f"{base_url}{endpoint}", headers=headers, timeout=5)
            print(f"   {endpoint}: {response.status_code}")
            if response.status_code == 200:
                print(f"      ✅ Available")
            elif response.status_code == 404:
                print(f"      ❌ Not found")
            else:
                print(f"      ⚠️ Status {response.status_code}")
        except Exception as e:
            print(f"   {endpoint}: Error - {e}")
    
    print(f"\n🔍 INVESTIGATION: How to Make Funds Available")
    print("-" * 50)
    
    # Method 1: Check if there's a deposit activation endpoint
    print("Method 1: Deposit Activation")
    try:
        # This might not exist, but worth checking
        activate_payload = {
            "token": "USDC",
            "amount": "6000000",  # 6.00 USDC in micro-units
            "depositor": user_address,
            "domain": 0
        }
        
        # Don't actually call this - just show what it would look like
        print("   Theoretical activation payload:")
        print(f"   {json.dumps(activate_payload, indent=2)}")
        
    except Exception as e:
        print(f"   Activation check failed: {e}")
    
    # Method 2: Check deposit requirements
    print(f"\nMethod 2: Proper Deposit Process")
    print("   Circle Gateway may require specific deposit flow:")
    print("   1. Transfer USDC to Gateway contract")
    print("   2. Call deposit function with proper parameters") 
    print("   3. Wait for confirmation to make funds 'available'")
    
    # Method 3: Check if it's a testnet vs mainnet issue
    print(f"\nMethod 3: Environment Check")
    print("   Possible issues:")
    print("   • Testnet vs mainnet contract mismatch")
    print("   • Wrong Gateway contract address")
    print("   • Incomplete deposit transaction")
    
    print(f"\n" + "=" * 60)
    print("🎯 RECOMMENDED FIXES")
    print("=" * 60)
    
    print("🔧 Fix 1: Re-deposit with Proper Flow")
    print("   • Use Circle's official deposit method")
    print("   • Ensure deposit transaction completes fully")
    print("   • Wait for blockchain confirmation")
    
    print(f"\n🔧 Fix 2: Check Gateway Contract")
    print("   • Verify using correct testnet Gateway address")
    print("   • Check if funds are stuck in wrong contract")
    print("   • May need to interact directly with contract")
    
    print(f"\n🔧 Fix 3: API Investigation")
    print("   • Check Circle documentation for deposit activation")
    print("   • Look for unlock/activate endpoints")
    print("   • Contact Circle support about locked funds")
    
    print(f"\n🚨 IMMEDIATE ACTION NEEDED:")
    print("The 6.00 USDC are deposited but not available for Gateway transfers.")
    print("Need to either:")
    print("1. Activate the existing deposit, or")
    print("2. Re-deposit using the correct Gateway flow")

if __name__ == "__main__":
    investigate_gateway_deposits()