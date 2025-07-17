#!/usr/bin/env python3
"""Test the enhanced OpenAI workflow parser"""

import os
import json
from parsers.workflow.openaiWorkflowParserEnhanced import EnhancedOpenAIWorkflowParser

# Test commands
test_commands = [
    "Generate KYC proof, verify it on blockchain, then send 0.1 USDC to Alice on Ethereum",
    "Generate location proof and verify on Solana, then transfer 0.05 USDC to Bob",
    "Generate AI content proof, verify locally and on Ethereum, then send 0.2 USDC to Charlie on Solana",
    "If Alice is KYC verified on-chain, send her 0.05 USDC on Solana",
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
    print(f"\n{'='*60}")
    print(f"Command: {cmd}")
    print('='*60)
    
    try:
        result = parser.parse_workflow(cmd)
        
        # Print parsed steps
        print(f"\nParsed into {len(result.get('steps', []))} steps:")
        for i, step in enumerate(result.get('steps', [])):
            print(f"{i+1}. {step['type']}: {step.get('description', 'No description')}")
            if step['type'] in ['verify_on_ethereum', 'verify_on_solana']:
                print(f"   - Blockchain: {step['type'].split('_')[-1]}")
                print(f"   - Proof type: {step.get('proof_type', 'unknown')}")
        
        # Validate workflow
        is_valid = parser.validate_workflow(result)
        print(f"\nWorkflow valid: {is_valid}")
        
    except Exception as e:
        print(f"Error: {e}")