#!/usr/bin/env python3
"""Test the parser output for complex blockchain workflows"""

import os
import json
import sys
from parsers.workflow.openaiWorkflowParserEnhanced import EnhancedOpenAIWorkflowParser

# Test cases focusing on blockchain verification
test_cases = [
    "Generate KYC proof for Alice, verify it on blockchain, then send 0.1 USDC to Alice on Ethereum",
    "If Charlie is KYC verified on-chain, send him 0.2 USDC on Ethereum",
    "Generate AI content proof, verify locally, verify on Ethereum, verify on Solana, then send 0.15 USDC to David",
]

# Get API key
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    print("Error: OPENAI_API_KEY not set")
    sys.exit(1)

# Create parser
parser = EnhancedOpenAIWorkflowParser(api_key)

# Test each command
for i, command in enumerate(test_cases, 1):
    print(f"\n{'='*80}")
    print(f"Test {i}: {command}")
    print('='*80)
    
    try:
        # Parse the workflow
        result = parser.parse_workflow(command)
        
        # Print the full parsed result
        print("\nParsed workflow:")
        print(json.dumps(result, indent=2))
        
        # Validate
        is_valid = parser.validate_workflow(result)
        print(f"\nValidation: {'✓ PASSED' if is_valid else '✗ FAILED'}")
        
        # Summary of blockchain verification steps
        blockchain_steps = [s for s in result.get('steps', []) if 'verify_on_' in s.get('type', '')]
        if blockchain_steps:
            print(f"\nBlockchain verification steps found: {len(blockchain_steps)}")
            for step in blockchain_steps:
                chain = step['type'].split('_')[-1].upper()
                print(f"  - {chain}: {step.get('description', 'No description')}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()