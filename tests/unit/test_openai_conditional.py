import sys
sys.path.append('/home/hshadab/agentkit/parsers/workflow')

from openaiWorkflowParserEnhanced import parse_workflow_with_openai

prompt = "Send 0.05 USDC on Solana if Bob is KYC verified on Solana and send 0.03 USDC on Ethereum if Alice is KYC verified on Ethereum."

print("Testing prompt:", prompt)
print("\nParsing with OpenAI...")

try:
    result = parse_workflow_with_openai(prompt)
    print("\nParsed workflow:")
    import json
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f"Error: {e}")