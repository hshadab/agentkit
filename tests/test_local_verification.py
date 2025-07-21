#!/usr/bin/env python3
"""Test local verification for all three proof types"""

import requests
import json
import time
import sys

# API endpoints
CHAT_API = "http://localhost:8002/chat"
VERIFY_API = "http://localhost:8001/api/v1/proof/{}/verify"

def test_proof_generation_and_verification(prompt, proof_type):
    """Generate a proof and verify it locally"""
    print(f"\n{'='*60}")
    print(f"Testing {proof_type} proof generation and verification")
    print(f"Prompt: {prompt}")
    print(f"{'='*60}")
    
    # Step 1: Generate proof via chat API
    print("\n1. Generating proof...")
    try:
        response = requests.post(CHAT_API, json={"message": prompt})
        response.raise_for_status()
        result = response.json()
        print(f"   Response: {result.get('response', 'No response')}")
        
        # Extract proof ID from metadata
        metadata = result.get('metadata', {})
        proof_id = None
        
        # Check if it's a workflow response
        if 'workflow_id' in metadata:
            print(f"   Workflow ID: {metadata['workflow_id']}")
            # For workflow responses, we need to wait and extract proof ID differently
            time.sleep(5)  # Give workflow time to complete
            
        # Try to extract proof ID from the response
        if 'proof_id' in metadata:
            proof_id = metadata['proof_id']
        elif 'proofId' in metadata:
            proof_id = metadata['proofId']
        
        if not proof_id:
            # Try parsing from response text
            response_text = result.get('response', '')
            if 'proof_' in response_text:
                import re
                match = re.search(r'(proof_[a-zA-Z_]+_\d+)', response_text)
                if match:
                    proof_id = match.group(1)
        
        if not proof_id:
            print("   ❌ Could not extract proof ID from response")
            print(f"   Full response: {json.dumps(result, indent=2)}")
            return False
            
        print(f"   ✓ Proof ID: {proof_id}")
        
    except Exception as e:
        print(f"   ❌ Error generating proof: {e}")
        return False
    
    # Step 2: Wait for proof to be stored
    print("\n2. Waiting for proof to be stored...")
    time.sleep(2)
    
    # Step 3: Verify proof locally
    print("\n3. Verifying proof locally...")
    try:
        verify_url = VERIFY_API.format(proof_id)
        response = requests.get(verify_url)
        
        if response.status_code == 404:
            print(f"   ❌ Proof not found (404)")
            return False
            
        response.raise_for_status()
        result = response.json()
        
        is_valid = result.get('valid', False)
        details = result.get('details', 'No details provided')
        
        if is_valid:
            print(f"   ✅ Verification PASSED")
            print(f"   Details: {details}")
        else:
            print(f"   ❌ Verification FAILED")
            print(f"   Details: {details}")
            
        return is_valid
        
    except Exception as e:
        print(f"   ❌ Error verifying proof: {e}")
        return False

def main():
    """Run all tests"""
    print("Testing Local Verification for All Proof Types")
    print("=" * 60)
    
    # Define test cases
    test_cases = [
        ("Generate KYC proof", "KYC"),
        ("Prove location: NYC (40.7, -74.0)", "Location"),
        ("Prove AI content authenticity", "AI Content")
    ]
    
    results = []
    
    # Run each test
    for prompt, proof_type in test_cases:
        success = test_proof_generation_and_verification(prompt, proof_type)
        results.append((proof_type, success))
        time.sleep(3)  # Space out requests
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    
    for proof_type, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{proof_type:15} : {status}")
    
    # Overall result
    all_passed = all(success for _, success in results)
    if all_passed:
        print(f"\n✅ All local verifications PASSED!")
        return 0
    else:
        print(f"\n❌ Some local verifications FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())