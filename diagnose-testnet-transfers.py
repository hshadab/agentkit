#!/usr/bin/env python3
"""
Comprehensive diagnostic tool to identify why testnet transfers don't move real funds
"""
import requests
import json
import time
from datetime import datetime

def diagnose_testnet_transfers():
    print("🔬 Comprehensive Testnet Transfer Diagnosis")
    print("=" * 70)
    
    # Configuration
    api_key = "SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838"
    base_url = "https://gateway-api-testnet.circle.com/v1"
    user_address = "0xE616B2eC620621797030E0AB1BA38DA68D78351C"
    
    print(f"🌐 Circle Gateway Testnet: {base_url}")
    print(f"🔑 API Key: {api_key[:20]}...")
    print(f"👤 User Address: {user_address}")
    print()
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    
    # Test 1: Check API Connection and Authentication
    print("📡 TEST 1: API Connection & Authentication")
    print("-" * 50)
    
    try:
        auth_response = requests.get(f"{base_url}/health", headers=headers, timeout=10)
        if auth_response.status_code == 200:
            print("✅ API connection successful")
        else:
            print(f"⚠️ API health check returned {auth_response.status_code}")
    except Exception as e:
        print(f"❌ API connection failed: {e}")
    
    # Test 2: Detailed Balance Analysis
    print(f"\n📊 TEST 2: Detailed Balance Analysis")
    print("-" * 50)
    
    balance_payload = {
        "token": "USDC",
        "sources": [
            {"domain": 0, "depositor": user_address},  # Ethereum Sepolia
            {"domain": 1, "depositor": user_address},  # Avalanche Fuji
            {"domain": 6, "depositor": user_address}   # Base Sepolia
        ]
    }
    
    def get_detailed_balance():
        response = requests.post(f"{base_url}/balances", headers=headers, json=balance_payload)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Balance API error: {response.status_code} - {response.text}")
            return None
    
    initial_balance = get_detailed_balance()
    if initial_balance:
        print("💰 Current Balance State:")
        total = 0
        for balance in initial_balance.get("balances", []):
            domain = balance.get("domain")
            amount = float(balance.get("balance", 0))
            available = float(balance.get("available", 0))
            total += amount
            
            domain_names = {0: "Ethereum Sepolia", 1: "Avalanche Fuji", 6: "Base Sepolia"}
            name = domain_names.get(domain, f"Domain {domain}")
            
            print(f"   {name}: {amount:.6f} USDC (available: {available:.6f})")
        
        print(f"   TOTAL: {total:.6f} USDC")
        
        # Analyze the balance structure
        print(f"\n🔍 Balance Analysis:")
        has_any_available = any(float(b.get("available", 0)) > 0 for b in initial_balance.get("balances", []))
        has_deposited = any(float(b.get("balance", 0)) > 0 for b in initial_balance.get("balances", []))
        
        if has_deposited and not has_any_available:
            print("🚨 ISSUE FOUND: All funds are deposited but none are available!")
            print("   This suggests funds are locked or not properly accessible for transfers")
        elif has_any_available:
            print("✅ Available funds found - transfers should be possible")
        else:
            print("❌ No funds available - need to fund Gateway first")
    
    # Test 3: API Capabilities Check
    print(f"\n🔧 TEST 3: API Capabilities")
    print("-" * 50)
    
    # Check if we can query transfer history
    try:
        # This endpoint might not exist, but let's see what happens
        history_response = requests.get(f"{base_url}/transfers", headers=headers, timeout=10)
        if history_response.status_code == 200:
            print("✅ Transfer history endpoint accessible")
            history = history_response.json()
            print(f"   Recent transfers: {len(history.get('transfers', []))}")
        elif history_response.status_code == 404:
            print("ℹ️ Transfer history endpoint not available")
        else:
            print(f"⚠️ Transfer history endpoint returned {history_response.status_code}")
    except Exception as e:
        print(f"ℹ️ Transfer history check failed: {e}")
    
    # Test 4: Identify the Real Issue
    print(f"\n🎯 TEST 4: Root Cause Analysis")
    print("-" * 50)
    
    print("Possible causes for non-moving funds:")
    print()
    
    # Check 1: API Key Type
    if "SAND_API_KEY" in api_key:
        print("🔍 Issue 1: API Key Type")
        print("   Status: ⚠️ Using SANDBOX API key")
        print("   Impact: Mixed - sandbox can still move testnet funds")
        print("   Solution: Verify if this sandbox key supports testnet transactions")
    
    # Check 2: Balance Availability
    if initial_balance:
        available_total = sum(float(b.get("available", 0)) for b in initial_balance.get("balances", []))
        deposited_total = sum(float(b.get("balance", 0)) for b in initial_balance.get("balances", []))
        
        print(f"\n🔍 Issue 2: Balance Availability")
        print(f"   Deposited: {deposited_total:.6f} USDC")
        print(f"   Available: {available_total:.6f} USDC")
        
        if deposited_total > 0 and available_total == 0:
            print("   Status: 🚨 CRITICAL - Funds locked/unavailable")
            print("   Impact: Transfers will fail silently")
            print("   Solution: Need to unlock or properly deposit funds")
        elif available_total > 0:
            print("   Status: ✅ Funds available for transfer")
        else:
            print("   Status: ❌ No funds to transfer")
    
    # Check 3: EIP-712 Signature Issues
    print(f"\n🔍 Issue 3: EIP-712 Signature Format")
    print("   Status: ⚠️ Complex signature requirements")
    print("   Impact: Invalid signatures cause API success but no transfer")
    print("   Solution: Verify signature format matches Circle's exact spec")
    
    # Check 4: Transaction Hash Validation
    print(f"\n🔍 Issue 4: Transaction Hash Analysis")
    print("   Status: ❓ Need to validate actual transaction hashes")
    print("   Impact: Fake/failed transactions show as success")
    print("   Solution: Check transaction hashes on testnet explorers")
    
    print(f"\n" + "=" * 70)
    print("🎯 DIAGNOSIS SUMMARY")
    print("=" * 70)
    
    if initial_balance:
        available_total = sum(float(b.get("available", 0)) for b in initial_balance.get("balances", []))
        deposited_total = sum(float(b.get("balance", 0)) for b in initial_balance.get("balances", []))
        
        if deposited_total > 0 and available_total == 0:
            print("🚨 PRIMARY ISSUE: FUNDS ARE LOCKED")
            print("   • You have deposited USDC but none is marked 'available'")
            print("   • Circle Gateway requires 'available' balance for transfers")
            print("   • This explains why API succeeds but no funds move")
            print()
            print("✅ SOLUTION:")
            print("   1. Check how funds were deposited to Gateway")
            print("   2. Ensure proper deposit method that makes funds 'available'")
            print("   3. May need to re-deposit using correct Gateway deposit flow")
        elif available_total > 0:
            print("💭 LIKELY ISSUE: EIP-712 OR API FORMAT")
            print("   • Funds are available but transfers aren't working")
            print("   • Issue likely in signature generation or API format")
            print("   • Need to verify exact Circle Gateway API specification")
        else:
            print("📋 ISSUE: NO FUNDS AVAILABLE")
            print("   • Need to fund Gateway with testnet USDC first")
            print("   • Use Circle testnet faucet or proper deposit method")
    
    return initial_balance

if __name__ == "__main__":
    balance_data = diagnose_testnet_transfers()