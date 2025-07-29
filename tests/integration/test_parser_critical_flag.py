#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from parsers.workflow.openaiWorkflowParserEnhanced import EnhancedOpenAIWorkflowParser
import os

# Test the parser to see if it sets critical flag
api_key = os.getenv('OPENAI_API_KEY', 'dummy-key-for-testing')
parser = EnhancedOpenAIWorkflowParser(api_key)

# Test IoT device registration command
command = "Register IoT device DEV999 with proximity proof"
print(f"Testing command: {command}\n")

result = parser.parse(command)

if result.get('error'):
    print(f"Error: {result['error']}")
else:
    print("Parsed workflow:")
    import json
    print(json.dumps(result, indent=2))
    
    # Check claim_rewards step
    print("\nChecking claim_rewards step:")
    for step in result.get('steps', []):
        if step.get('type') == 'claim_rewards':
            print(f"Found claim_rewards step:")
            print(f"  - critical: {step.get('critical', 'NOT SET')}")
            print(f"  - Full step: {json.dumps(step, indent=4)}")