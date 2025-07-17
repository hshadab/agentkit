#!/usr/bin/env python3
import os
import sys
import importlib

# Force reload
if 'parsers.workflow.openaiWorkflowParserEnhanced' in sys.modules:
    del sys.modules['parsers.workflow.openaiWorkflowParserEnhanced']

from parsers.workflow.openaiWorkflowParserEnhanced import EnhancedOpenAIWorkflowParser

# Test directly
parser = EnhancedOpenAIWorkflowParser(api_key=os.getenv('OPENAI_API_KEY'))

test_commands = [
    "Generate KYC proof then send 0.1 USDC to Alice",
    "Generate KYC proof, verify on blockchain, then send 0.1 USDC to Alice",
    "If Charlie is KYC verified on-chain, send him 0.2 USDC",
]

for cmd in test_commands:
    print(f"\nCommand: {cmd}")
    result = parser.parse_workflow(cmd)
    print("Steps:")
    for step in result.get('steps', []):
        print(f"  - {step['type']}: {step['description']}")