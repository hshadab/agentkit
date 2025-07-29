#!/usr/bin/env python3

import requests
import json
import time

print("🧪 Testing IoT Workflow with Non-Critical Rewards Claim\n")

# Test the workflow execution
command = "Register IoT device TESTDEV999 with proximity proof"
print(f"Command: {command}")

try:
    response = requests.post(
        'http://localhost:8002/execute_workflow',
        json={'command': command},
        timeout=180
    )
    
    print(f"\nResponse status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Result: {json.dumps(result, indent=2)}")
        
        if result.get('success'):
            print("\n✅ Workflow completed successfully!")
            print("The claim_rewards step is now non-critical, so workflow completes even if no rewards are available.")
        else:
            print(f"\n❌ Workflow failed: {result.get('error')}")
            
            # Check if it failed at claim_rewards
            if 'claim_rewards' in str(result.get('error', '')):
                print("\n⚠️  Note: The workflow still failed at claim_rewards step.")
                print("This means the parser changes were applied but the executor still treats it as critical.")
    else:
        print(f"Error: {response.text}")
        
except Exception as e:
    print(f"Error: {e}")

print("\n📝 Summary:")
print("- Modified parser to mark claim_rewards as critical: false")
print("- This allows workflows to complete even when no rewards are available")
print("- Rewards can be claimed later when they become available")