#!/usr/bin/env python3
"""Test local verification for all proof types using existing proofs"""

import requests
import json
import time
import sys

# API endpoint
VERIFY_API = "http://localhost:8001/api/v1/proof/{}/verify"

def test_verify_proof(proof_id, proof_type):
    """Test local verification of a proof"""
    print(f"\n{'='*60}")
    print(f"Testing {proof_type} Proof Verification")
    print(f"Proof ID: {proof_id}")
    print(f"{'='*60}")
    
    start_time = time.time()
    
    try:
        verify_url = VERIFY_API.format(proof_id)
        print(f"Calling: GET {verify_url}")
        
        response = requests.get(verify_url, timeout=30)
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f} seconds")
        
        if response.status_code == 404:
            print("❌ Proof not found (404)")
            return False
            
        response.raise_for_status()
        result = response.json()
        
        print(f"Response: {json.dumps(result, indent=2)}")
        
        is_valid = result.get('valid', False)
        details = result.get('details', 'No details provided')
        
        if is_valid:
            print(f"✅ Verification PASSED")
        else:
            print(f"❌ Verification FAILED")
            
        return is_valid
        
    except requests.exceptions.Timeout:
        print(f"❌ Request timed out after 30 seconds")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def get_available_proofs():
    """Get list of available proofs from the database"""
    try:
        with open('proofs_db.json', 'r') as f:
            proofs_db = json.load(f)
            
        # Group proofs by type
        kyc_proofs = []
        location_proofs = []
        ai_content_proofs = []
        
        for proof_id, proof_data in proofs_db.items():
            if proof_data.get('status') == 'complete':
                function = proof_data.get('metadata', {}).get('function', '')
                if function == 'prove_kyc':
                    kyc_proofs.append(proof_id)
                elif function == 'prove_location':
                    location_proofs.append(proof_id)
                elif function == 'prove_ai_content':
                    ai_content_proofs.append(proof_id)
        
        return {
            'kyc': kyc_proofs,
            'location': location_proofs,
            'ai_content': ai_content_proofs
        }
    except Exception as e:
        print(f"Error reading proofs database: {e}")
        return {}

def main():
    """Run all tests"""
    print("Testing Local Verification for All Proof Types")
    print("=" * 60)
    
    # Get available proofs
    available_proofs = get_available_proofs()
    
    print("\nAvailable proofs:")
    print(f"- KYC proofs: {len(available_proofs.get('kyc', []))}")
    print(f"- Location proofs: {len(available_proofs.get('location', []))}")
    print(f"- AI Content proofs: {len(available_proofs.get('ai_content', []))}")
    
    results = []
    
    # Test KYC proof
    kyc_proofs = available_proofs.get('kyc', [])
    if kyc_proofs:
        # Test the most recent one
        proof_id = kyc_proofs[-1]
        success = test_verify_proof(proof_id, "KYC")
        results.append(("KYC", success))
    else:
        print("\n⚠️  No KYC proofs available to test")
        results.append(("KYC", None))
    
    # Test Location proof
    location_proofs = available_proofs.get('location', [])
    if location_proofs:
        proof_id = location_proofs[-1]
        success = test_verify_proof(proof_id, "Location")
        results.append(("Location", success))
    else:
        print("\n⚠️  No Location proofs available to test")
        results.append(("Location", None))
    
    # Test AI Content proof
    ai_content_proofs = available_proofs.get('ai_content', [])
    if ai_content_proofs:
        proof_id = ai_content_proofs[-1]
        success = test_verify_proof(proof_id, "AI Content")
        results.append(("AI Content", success))
    else:
        print("\n⚠️  No AI Content proofs available to test")
        results.append(("AI Content", None))
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    
    for proof_type, success in results:
        if success is None:
            status = "⚠️  NO PROOFS TO TEST"
        elif success:
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        print(f"{proof_type:15} : {status}")
    
    # Overall result
    tested_results = [s for _, s in results if s is not None]
    if all(tested_results) and len(tested_results) > 0:
        print(f"\n✅ All available proof verifications PASSED!")
        return 0
    elif not tested_results:
        print(f"\n⚠️  No proofs were available to test!")
        return 1
    else:
        print(f"\n❌ Some proof verifications FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())