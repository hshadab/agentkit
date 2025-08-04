#!/usr/bin/env python3
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from parsers.workflow.openaiWorkflowParserEnhanced import EnhancedOpenAIWorkflowParser

# Test the parser directly
api_key = os.getenv('OPENAI_API_KEY')
parser = EnhancedOpenAIWorkflowParser(api_key)

command = "Test medical record integrity for patient 12345"
print(f"Parsing command: {command}")

result = parser.parse_workflow(command)

import json
print("\nParsed workflow:")
print(json.dumps(result, indent=2))

# Validate
if parser.validate_workflow(result):
    print("\n✅ Workflow validation passed")
else:
    print("\n❌ Workflow validation failed")