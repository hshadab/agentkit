#!/usr/bin/env python3

import json
import sys
sys.path.append('/home/hshadab/agentkit')

from parsers.workflow.openaiWorkflowParserEnhanced import EnhancedOpenAIWorkflowParser
import os

# Test the parser with a verify command
parser = EnhancedOpenAIWorkflowParser(api_key=os.getenv('OPENAI_API_KEY'))

test_command = "Verify proof proof_kyc_1752339806761"
print(f"Testing command: {test_command}")
print("-" * 50)

result = parser.parse_workflow(test_command)
print(json.dumps(result, indent=2))

# Check if proof_id is properly parsed
if result.get('steps'):
    step = result['steps'][0]
    if 'proof_id' in step:
        print("\n✅ SUCCESS: proof_id field found in step")
        print(f"   proof_id: {step['proof_id']}")
    else:
        print("\n❌ FAIL: proof_id field NOT found in step")
        print(f"   Step fields: {list(step.keys())}")