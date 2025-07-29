#!/usr/bin/env python3

import requests
import json
import time

print("🧪 Testing IoT Workflow with Fixed Non-Critical Rewards\n")
print("This test verifies that workflows complete successfully even when rewards are not available.\n")

# Use a unique device ID to avoid conflicts
device_id = f"TESTDEV_{int(time.time())}"
command = f"Register IoT device {device_id} with proximity proof"

print(f"Command: {command}")
print("\nExpected behavior:")
print("1. Device registration - may require MetaMask approval")
print("2. Proof generation - uses zkEngine")  
print("3. IoTeX verification - may require MetaMask approval")
print("4. Claim rewards - should NOT fail the workflow if no rewards available")
print("\n" + "="*60 + "\n")

try:
    response = requests.post(
        'http://localhost:8002/execute_workflow',
        json={'command': command},
        timeout=180
    )
    
    print(f"Response status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        
        # Check if workflow succeeded overall
        if result.get('success'):
            print("✅ SUCCESS: Workflow completed successfully!")
            print("\nThis confirms the fix is working:")
            print("- claim_rewards step is marked as non-critical")
            print("- Workflow completes even without rewards")
        else:
            # Parse the error to check what happened
            error_msg = result.get('error', '')
            if 'claim_rewards' in error_msg and 'Critical step failed' in error_msg:
                print("❌ ISSUE: Workflow still treating claim_rewards as critical")
                print("\nPossible causes:")
                print("1. Old parsed workflow file being used")
                print("2. Parser changes not applied")
                print("\nSolution: Ensure the workflow is freshly parsed with updated parser")
            else:
                print(f"❌ Workflow failed: {error_msg}")
        
        # Show step results if available
        if 'stdout' in result and 'Step' in result['stdout']:
            print("\n📋 Step Results:")
            lines = result['stdout'].split('\n')
            for line in lines:
                if 'step' in line.lower() and ('completed' in line or 'failed' in line):
                    print(f"  {line.strip()}")
                    
    else:
        print(f"Error: {response.text}")
        
except Exception as e:
    print(f"Error: {e}")

print("\n" + "="*60)
print("\n📝 Summary:")
print("The parser has been updated to mark claim_rewards as critical: false")
print("This allows IoT workflows to complete even when the contract has no rewards")
print("Make sure to use freshly parsed workflows for the fix to take effect")