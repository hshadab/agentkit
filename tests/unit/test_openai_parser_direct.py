#!/usr/bin/env python3
"""Test OpenAI parser directly"""

import os
import json
import asyncio
from parsers.workflow.openaiWorkflowParserEnhanced import EnhancedOpenAIWorkflowParser

async def test_parser():
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("Error: OPENAI_API_KEY not set")
        return
    
    parser = EnhancedOpenAIWorkflowParser(api_key)
    
    # Test command
    command = "Generate KYC proof, verify it on blockchain, then send 0.1 USDC to Alice"
    print(f"Testing: {command}")
    
    try:
        result = parser.parse_workflow(command)
        print(f"\nResult:")
        print(json.dumps(result, indent=2))
        
        if result.get('steps'):
            print(f"\nParsed {len(result['steps'])} steps successfully!")
        else:
            print("\nNo steps returned!")
            
    except Exception as e:
        print(f"Error: {e}")

# Run the test
asyncio.run(test_parser())