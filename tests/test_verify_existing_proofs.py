#!/usr/bin/env python3
"""Test local verification for existing proofs"""

import requests
import json
import sys

# API endpoint
VERIFY_API = "http://localhost:8001/api/v1/proof/{}/verify"

def verify_proof(proof_id):
    """Verify a proof locally"""
    print(f"\nVerifying proof: {proof_id}")
    print("-" * 40)
    
    try:
        verify_url = VERIFY_API.format(proof_id)
        response = requests.get(verify_url)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 404:
            print("❌ Proof not found (404)")
            return False
            
        response.raise_for_status()
        result = response.json()
        
        is_valid = result.get('valid', False)
        details = result.get('details', 'No details provided')
        
        print(f"Valid: {is_valid}")
        print(f"Details: {details}")
        
        if is_valid:
            print("✅ Verification PASSED")
        else:
            print("❌ Verification FAILED")
            
        return is_valid
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Test with the proof ID from the UI"""
    print("Testing Local Verification")
    print("=" * 60)
    
    # The proof ID from your UI test
    proof_id = "proof_kyc_1752864049348"
    
    print(f"\nTesting with proof ID: {proof_id}")
    success = verify_proof(proof_id)
    
    if success:
        print(f"\n✅ Local verification works!")
        return 0
    else:
        print(f"\n❌ Local verification failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())