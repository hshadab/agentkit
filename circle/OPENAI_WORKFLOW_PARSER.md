# OpenAI Workflow Parser Integration

## Overview

The OpenAI workflow parser has been integrated into `langchain_service.py` to handle complex conditional transfers and natural language workflow commands that the regex-based parser struggles with.

## Features

1. **Automatic Detection**: The system automatically detects when a command is complex enough to warrant OpenAI parsing
2. **Natural Language Understanding**: Handles variations in how users express conditional transfers
3. **Multi-Condition Support**: Properly parses commands with multiple "if" conditions and "and" operators
4. **Backward Compatibility**: Falls back to regex parser for simple commands to save API calls

## How It Works

1. When a workflow command is received, `is_complex_workflow()` checks if it's complex
2. Complex workflows are sent to `parse_workflow_with_openai()` which uses GPT-4
3. The parsed workflow is saved to a temporary JSON file
4. The workflow executor loads the pre-parsed file instead of using regex parsing
5. The temporary file is cleaned up after execution

## Supported Patterns

The OpenAI parser excels at these complex patterns:

- Multiple conditional transfers: "If Alice is KYC verified send her 0.05 USDC on Solana and if Bob is KYC verified send him 0.03 USDC on Ethereum"
- Natural variations: "Send 0.1 USDC to Charlie but only if he's KYC compliant"
- Complex conditions: "Transfer 1 USDC to Dave if he is both KYC verified and location is San Francisco"
- Alternative flows: "If Emma has AI content verification send her 0.15 USDC otherwise send 0.05 USDC"

## Testing

### Test the Parser Directly
```bash
cd /home/hshadab/agentkit/circle
python test-openai-parser-direct.py
```

### Test Full Workflow Execution
```bash
python test-openai-workflow.py
```

### Test via API
```bash
curl -X POST http://localhost:8002/execute_workflow \
  -H "Content-Type: application/json" \
  -d '{"command": "If Alice is KYC verified send her 0.05 USDC on Solana and if Bob is KYC verified send him 0.03 USDC on Ethereum"}'
```

## Configuration

Ensure your `.env` file has:
```
OPENAI_API_KEY=your-api-key-here
```

## Output Format

The OpenAI parser generates the same JSON structure as the regex parser:

```json
{
  "description": "original command",
  "steps": [
    {
      "index": 0,
      "type": "kyc_proof",
      "proofType": "kyc",
      "description": "Generate KYC proof for alice",
      "person": "alice"
    },
    {
      "index": 1,
      "type": "verification",
      "verificationType": "kyc",
      "description": "Verify kyc proof for alice",
      "person": "alice"
    },
    {
      "index": 2,
      "type": "transfer",
      "amount": "0.05",
      "recipient": "alice",
      "blockchain": "SOL",
      "requiresProof": true,
      "requiredProofTypes": ["kyc"],
      "conditions": [{"type": "kyc", "description": "KYC verified"}]
    }
  ],
  "requiresProofs": true
}
```

## API Usage

The model used is `gpt-4-turbo-preview` with:
- Temperature: 0.1 (for consistency)
- Response format: JSON object (structured output)
- Max tokens: 1000

## Error Handling

- If OpenAI API fails, the system falls back to an empty workflow
- Temporary files are always cleaned up, even on errors
- All errors are logged for debugging