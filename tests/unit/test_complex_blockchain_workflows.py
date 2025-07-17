#!/usr/bin/env python3
"""Test complex workflows with on-chain verification triggering USDC transfers"""

import json
import requests
import time
import sys

# Base URL for the API
BASE_URL = "http://localhost:8000"

# Complex workflow test cases
test_workflows = [
    # 1. Basic on-chain verification triggering transfer
    {
        "name": "Basic Ethereum Verification",
        "command": "Generate KYC proof for Alice, verify it on blockchain, then send 0.1 USDC to Alice on Ethereum"
    },
    
    # 2. Explicit Solana verification
    {
        "name": "Solana Verification",
        "command": "Generate location proof, verify it on Solana, then transfer 0.05 USDC to Bob on SOL"
    },
    
    # 3. Conditional transfer based on on-chain verification
    {
        "name": "Conditional On-Chain Transfer",
        "command": "If Charlie is KYC verified on-chain, send him 0.2 USDC on Ethereum"
    },
    
    # 4. Multiple verifications on different chains
    {
        "name": "Multi-Chain Verification",
        "command": "Generate AI content proof, verify locally, verify on Ethereum, verify on Solana, then send 0.15 USDC to David"
    },
    
    # 5. Complex multi-person workflow
    {
        "name": "Multi-Person On-Chain",
        "command": "Generate KYC for Alice and verify on blockchain, generate location proof for Bob and verify on Solana, then send 0.1 USDC to Alice on ETH and 0.05 USDC to Bob on SOL"
    },
    
    # 6. Natural language conditional
    {
        "name": "Natural Language Conditional",
        "command": "When Emma's KYC is verified on the blockchain, transfer 0.3 USDC to her wallet"
    },
    
    # 7. Multiple conditions with on-chain verification
    {
        "name": "Multiple Conditions",
        "command": "If Frank is KYC compliant and verified on Ethereum, send him 0.25 USDC, and if Grace is location verified on Solana, send her 0.15 USDC on SOL"
    },
    
    # 8. Sequential on-chain verifications
    {
        "name": "Sequential Verifications",
        "command": "Generate location proof for Henry, verify it locally, then verify on-chain, and if successful send 0.4 USDC"
    },
    
    # 9. Complex natural language with defaults
    {
        "name": "Natural Language Defaults",
        "command": "After verifying Isabel's AI content authenticity on the blockchain, please transfer half a dollar worth of USDC to her"
    },
    
    # 10. Both chains explicitly
    {
        "name": "Both Chains Explicit",
        "command": "Generate KYC proof for Jack, verify on both Ethereum and Solana blockchains, then send 0.6 USDC to Jack on whichever chain verified successfully"
    }
]

def test_workflow(workflow):
    """Test a single workflow"""
    print(f"\n{'='*80}")
    print(f"Testing: {workflow['name']}")
    print(f"Command: {workflow['command']}")
    print('='*80)
    
    try:
        # First, let's check if this is recognized as a complex workflow
        # by calling the chat endpoint to see the routing
        chat_response = requests.post(
            f"{BASE_URL}/chat",
            json={"message": workflow['command']},
            headers={"Content-Type": "application/json"}
        )
        
        if chat_response.status_code == 200:
            chat_result = chat_response.json()
            print(f"\nChat routing: {chat_result.get('intent', 'unknown')}")
            
            # If it's a workflow, it might be executed directly
            if chat_result.get('intent') == 'workflow_executed':
                print("✓ Workflow executed via chat endpoint")
                if 'workflow_result' in chat_result:
                    print_workflow_result(chat_result['workflow_result'])
                return
        
        # Otherwise, execute via workflow endpoint
        print("\nExecuting via workflow endpoint...")
        response = requests.post(
            f"{BASE_URL}/execute_workflow",
            json={"command": workflow['command']},
            headers={"Content-Type": "application/json"},
            timeout=60  # 60 second timeout for complex workflows
        )
        
        if response.status_code == 200:
            result = response.json()
            print_workflow_result(result)
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out (workflow may still be running)")
    except Exception as e:
        print(f"❌ Error: {e}")

def print_workflow_result(result):
    """Pretty print workflow result"""
    if result.get('success'):
        print("\n✅ Workflow completed successfully!")
        
        # Print proof summary
        if result.get('proofSummary'):
            print("\nProof Summary:")
            for proof_type, info in result['proofSummary'].items():
                print(f"  - {proof_type}: {info.get('status', 'unknown')} (ID: {info.get('proofId', 'N/A')})")
        
        # Print transfer IDs
        if result.get('transferIds'):
            print("\nTransfers:")
            for transfer_id in result['transferIds']:
                print(f"  - Transfer ID: {transfer_id}")
        
        # Print execution steps
        if result.get('stepResults'):
            print("\nExecution Steps:")
            for step in result['stepResults']:
                status_icon = "✓" if step.get('status') == 'completed' else "✗"
                print(f"  {status_icon} Step {step.get('step', '?')}: {step.get('type', 'unknown')} - {step.get('status', 'unknown')}")
                
                # Show blockchain verification details
                if step.get('type') in ['verify_on_ethereum', 'verify_on_solana'] and step.get('result'):
                    chain = step['type'].split('_')[-1].capitalize()
                    if step['result'].get('transactionHash'):
                        print(f"    → {chain} TX: {step['result']['transactionHash']}")
                    if step['result'].get('explorerUrl'):
                        print(f"    → Explorer: {step['result']['explorerUrl']}")
    else:
        print(f"\n❌ Workflow failed: {result.get('error', 'Unknown error')}")

def main():
    """Run all tests"""
    print("Testing Complex Blockchain Verification Workflows")
    print("=" * 80)
    
    # Check if server is running
    try:
        health = requests.get(f"{BASE_URL}/")
        if health.status_code != 200:
            print("❌ Server not responding. Please ensure the server is running.")
            sys.exit(1)
    except:
        print("❌ Cannot connect to server at http://localhost:8000")
        print("Please start the server with: python chat_service.py")
        sys.exit(1)
    
    print("✓ Server is running\n")
    
    # Test each workflow
    for i, workflow in enumerate(test_workflows, 1):
        print(f"\n[{i}/{len(test_workflows)}] ", end="")
        test_workflow(workflow)
        
        # Small delay between tests
        if i < len(test_workflows):
            time.sleep(2)
    
    print("\n" + "="*80)
    print("All tests completed!")

if __name__ == "__main__":
    main()