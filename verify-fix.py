#!/usr/bin/env python3
"""
Verify that the Gateway locked funds issue is now fixed
"""
import requests
import json

def verify_gateway_fix():
    print("✅ Verifying Gateway Fix After Fresh USDC Transfer")
    print("=" * 60)
    
    # Configuration
    api_key = "SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838"
    base_url = "https://gateway-api-testnet.circle.com/v1"
    user_address = "0xE616B2eC620621797030E0AB1BA38DA68D78351C"
    
    print(f"🔍 Transaction Analysis:")
    print(f"   TX Hash: 0xaba16a21991303dc330fdef6470558f0077ba21c14fec298d9b9c0d454d751d3")
    print(f"   Amount: 10 USDC")
    print(f"   To Address: {user_address}")
    print(f"   Result: Fresh USDC directly to wallet (not Gateway deposit)")
    print()
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    
    # Check Gateway balance after the fix
    print("📊 Checking Gateway Balance After Fix")
    print("-" * 50)
    
    balance_payload = {
        "token": "USDC",
        "sources": [
            {"domain": 0, "depositor": user_address},  # Ethereum Sepolia
            {"domain": 1, "depositor": user_address},  # Avalanche Fuji
            {"domain": 6, "depositor": user_address}   # Base Sepolia
        ]
    }
    
    try:
        response = requests.post(f"{base_url}/balances", headers=headers, json=balance_payload)
        
        if response.status_code == 200:
            balance_data = response.json()
            print("💰 Gateway Balance Response:")
            print(json.dumps(balance_data, indent=2))
            
            # Analyze the new balance state
            total_deposited = 0
            total_available = 0
            
            for balance in balance_data.get("balances", []):
                domain = balance.get("domain")
                deposited = float(balance.get("balance", 0))
                available = float(balance.get("available", 0))
                
                total_deposited += deposited
                total_available += available
                
                domain_names = {0: "Ethereum Sepolia", 1: "Avalanche Fuji", 6: "Base Sepolia"}
                name = domain_names.get(domain, f"Domain {domain}")
                
                print(f"   {name}: {deposited:.6f} USDC deposited, {available:.6f} USDC available")
            
            print(f"\n📊 Balance Summary:")
            print(f"   Total Deposited: {total_deposited:.6f} USDC")
            print(f"   Total Available: {total_available:.6f} USDC")
            
            # Determine fix status
            if total_deposited > 0 and total_available == 0:
                print(f"\n🚨 STILL LOCKED: Funds deposited but not available")
                print(f"   Issue: The 10 USDC went directly to wallet, not Gateway")
                print(f"   Solution: Need to deposit the 10 USDC to Gateway properly")
                return "still_locked"
            elif total_available > 0:
                print(f"\n🎉 FIXED: Available balance found!")
                print(f"   Available: {total_available:.6f} USDC")
                print(f"   Status: Ready for Gateway transfers!")
                return "fixed"
            else:
                print(f"\n❓ NO FUNDS: No Gateway balance found")
                print(f"   The 10 USDC are in wallet but not deposited to Gateway")
                print(f"   Next: Need to deposit to Gateway to use for transfers")
                return "no_gateway_funds"
                
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
            return "api_error"
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return "request_failed"

def check_wallet_balance():
    print(f"\n💳 Wallet Balance Check")
    print("-" * 30)
    print(f"The transaction shows you now have:")
    print(f"   • 10 USDC in your wallet on Sepolia")
    print(f"   • This is separate from Gateway balance")
    print(f"   • You can now deposit this to Gateway if needed")

if __name__ == "__main__":
    result = verify_gateway_fix()
    check_wallet_balance()
    
    print(f"\n" + "=" * 60)
    print(f"🎯 VERIFICATION RESULT: {result.upper()}")
    print("=" * 60)
    
    if result == "fixed":
        print("✅ Gateway transfers should now work!")
        print("   The available balance can be used for 0.01 USDC transfers")
    elif result == "no_gateway_funds":
        print("📋 NEXT STEP: Deposit USDC to Gateway")
        print("   1. The 10 USDC are in your wallet (good!)")
        print("   2. Now deposit some to Gateway to make them 'available'")
        print("   3. Then Gateway transfers will work")
    elif result == "still_locked":
        print("🔧 ADDITIONAL FIX NEEDED:")
        print("   The Gateway still shows locked funds")
        print("   Try using Circle faucet to fund Gateway directly")
    
    print(f"\n🔗 Transaction: https://sepolia.etherscan.io/tx/0xaba16a21991303dc330fdef6470558f0077ba21c14fec298d9b9c0d454d751d3")