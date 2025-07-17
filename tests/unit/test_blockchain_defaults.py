#!/usr/bin/env python3
"""Test blockchain verification defaults"""

import os
import json
from parsers.workflow.openaiWorkflowParserEnhanced import EnhancedOpenAIWorkflowParser

# Test commands to verify Ethereum is default
test_commands = [
    # Should default to Ethereum
    "Generate KYC proof, verify it on blockchain, then send 0.1 USDC to Alice",
    "Generate location proof and verify on-chain, then transfer 0.05 USDC to Bob",
    
    # Should explicitly use Solana
    "Generate KYC proof, verify it on Solana, then send 0.1 USDC to Alice on SOL",
    "Generate AI content proof and verify on Solana blockchain, then transfer to Charlie",
    
    # Should use both when explicitly requested
    "Generate KYC proof, verify on both Ethereum and Solana, then send to David",
    
    # Complex natural language
    "If Alice is KYC compliant and verified on-chain, send her 0.05 USDC",
]

# Get API key
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    print("Error: OPENAI_API_KEY not set")
    exit(1)

# Create parser
parser = EnhancedOpenAIWorkflowParser(api_key)

# Test each command
for cmd in test_commands:
    print(f"\n{'='*80}")
    print(f"Command: {cmd}")
    print('='*80)
    
    try:
        result = parser.parse_workflow(cmd)
        
        # Print parsed steps
        print(f"\nParsed into {len(result.get('steps', []))} steps:")
        for i, step in enumerate(result.get('steps', [])):
            print(f"\n{i+1}. Type: {step['type']}")
            print(f"   Description: {step.get('description', 'No description')}")
            
            # Highlight blockchain verification steps
            if step['type'] in ['verify_on_ethereum', 'verify_on_solana']:
                print(f"   ✓ BLOCKCHAIN: {step['type'].split('_')[-1].upper()}")
                print(f"   Proof type: {step.get('proof_type', 'unknown')}")
            
            # Show transfer details
            if step['type'] == 'transfer':
                print(f"   Amount: {step.get('amount', 'unknown')} USDC")
                print(f"   Recipient: {step.get('recipient', 'unknown')}")
                print(f"   Blockchain: {step.get('blockchain', 'ETH (default)')}")
        
        # Validate workflow
        is_valid = parser.validate_workflow(result)
        print(f"\nWorkflow validation: {'✓ PASSED' if is_valid else '✗ FAILED'}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()