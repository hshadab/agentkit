#!/usr/bin/env python3
"""
Quick Gateway balance checker
"""
import requests
import json

def check_gateway_balance():
    """Check Circle Gateway unified balance"""
    
    # Gateway API endpoint
    url = "https://gateway-api-testnet.circle.com/v1/balances"
    
    # Your depositor address
    depositor = "0xe616b2ec620621797030e0ab1ba38da68d78351c"
    
    payload = {
        "token": "USDC",
        "sources": [
            {
                "domain": 0,  # Sepolia
                "depositor": depositor
            }
        ]
    }
    
    headers = {
        "Content-Type": "application/json",
        # Note: This would need your actual Circle Gateway API key
        # "Authorization": "Bearer YOUR_API_KEY"
    }
    
    try:
        print("🔍 Checking Gateway unified balance...")
        print(f"📍 Depositor: {depositor}")
        print(f"🌐 API: {url}")
        
        response = requests.post(url, json=payload, headers=headers)
        
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Response: {json.dumps(data, indent=2)}")
            
            if data.get('balances'):
                total = sum(float(b.get('balance', 0)) for b in data['balances'])
                print(f"💰 Total Unified Spendable Balance: {total:.6f} USDC")
                
                for balance in data['balances']:
                    domain = balance.get('domain')
                    amount = balance.get('balance', '0')
                    available = balance.get('available', '0') 
                    print(f"   Domain {domain}: {amount} USDC (available: {available})")
                    
                return total
            else:
                print("❌ No balances found in response")
                return 0
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error checking balance: {e}")
        return None

if __name__ == "__main__":
    balance = check_gateway_balance()
    
    if balance is not None and balance >= 6.33:
        print(f"\n🎉 SUCCESS: {balance:.2f} USDC ≥ 6.33 USDC required!")
        print("✅ 3-chain transfers should work now!")
    elif balance is not None:
        print(f"\n⚠️  INSUFFICIENT: {balance:.2f} USDC < 6.33 USDC required")
        print(f"💡 Need {6.33 - balance:.2f} more USDC")
    else:
        print("\n❌ Could not check balance - API key may be required")