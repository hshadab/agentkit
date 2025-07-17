#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chat_service import parse_workflow_with_openai, is_complex_workflow
import json

async def test_parser():
    """Test the OpenAI parser directly"""
    
    test_cases = [
        # Original failing case
        "If Alice is KYC verified send her 0.05 USDC on Solana and if Bob is KYC verified send him 0.03 USDC on Ethereum",
        
        # More complex variations
        "Send 0.1 USDC to Charlie on ETH but only if he's KYC compliant and located in NYC",
        "When Dave becomes KYC verified transfer 0.2 USDC to him on Solana",
        "If Emma has AI content verification send her 0.15 USDC on SOL otherwise if she's KYC verified send 0.05 USDC on ETH",
        "Transfer 1 USDC to Frank if he is both KYC verified and location is San Francisco",
        
        # Natural language variations
        "Please send Alice 0.5 USDC on Ethereum if she passes KYC verification",
        "Once Bob is verified for KYC compliance, transfer him 0.25 USDC on the Solana network",
        "If Carol's location is verified to be in London, send her 0.1 USDC, otherwise if she's KYC verified send 0.05 USDC"
    ]
    
    for i, command in enumerate(test_cases, 1):
        print(f"\n{'='*80}")
        print(f"Test Case {i}:")
        print(f"Command: {command}")
        print(f"Complex workflow: {is_complex_workflow(command)}")
        print(f"\nParsed Output:")
        
        try:
            result = await parse_workflow_with_openai(command)
            print(json.dumps(result, indent=2))
            
            # Summary
            if 'steps' in result:
                print(f"\nSummary:")
                print(f"  Total steps: {len(result['steps'])}")
                proof_steps = [s for s in result['steps'] if s['type'].endswith('_proof')]
                verify_steps = [s for s in result['steps'] if s['type'] == 'verification']
                transfer_steps = [s for s in result['steps'] if s['type'] == 'transfer']
                print(f"  Proof generations: {len(proof_steps)}")
                print(f"  Verifications: {len(verify_steps)}")
                print(f"  Transfers: {len(transfer_steps)}")
                
                if transfer_steps:
                    print(f"\nTransfers:")
                    for t in transfer_steps:
                        print(f"    - {t.get('amount', '?')} USDC to {t.get('recipient', '?')} on {t.get('blockchain', 'ETH')}")
                        if t.get('conditions'):
                            print(f"      Conditions: {', '.join(c['type'] for c in t['conditions'])}")
        except Exception as e:
            print(f"Error: {str(e)}")

if __name__ == "__main__":
    print("🧪 Testing OpenAI Workflow Parser\n")
    print("This test demonstrates the OpenAI parser's ability to handle complex")
    print("conditional transfers that the regex-based parser struggles with.\n")
    
    asyncio.run(test_parser())