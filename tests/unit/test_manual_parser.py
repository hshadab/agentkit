#!/usr/bin/env python3
"""Manually test the enhanced parser to see exact output"""

import os
import json
from openai import OpenAI

# Get API key
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    print("Error: OPENAI_API_KEY not set")
    exit(1)

client = OpenAI(api_key=api_key)

# Test a simple command
command = "Generate KYC proof, verify it on blockchain, then send 0.1 USDC to Alice"

system_prompt = """You are a workflow parser for a zero-knowledge proof and cryptocurrency transfer system.
        
Your task is to parse natural language commands into structured workflow steps.

Available step types:
1. generate_proof: Generate a zero-knowledge proof (kyc, location, ai_content)
2. verify_proof: Verify a previously generated proof locally
3. verify_on_ethereum: Verify a proof on Ethereum blockchain
4. verify_on_solana: Verify a proof on Solana blockchain
5. transfer: Send USDC to a recipient on Ethereum or Solana

Rules:
- If a transfer has a condition (like "if KYC verified"), you must first generate and verify that proof
- "verify on blockchain" or "verify on-chain" means verify on Ethereum by default (NOT both chains)
- To verify on Solana, the user must explicitly mention "Solana" or "SOL"
- "verify on Ethereum" or "verify on ETH" means only Ethereum verification
- "verify on Solana" or "verify on SOL" means only Solana verification
- Each person mentioned needs their own proof generation and verification
- Transfers can only happen after successful verification
- Parse amounts carefully (0.05 USDC = 0.05, not 5)
- Default blockchain for transfers is Ethereum unless specified

Output format:
{
  "description": "Original command",
  "steps": [
    {
      "type": "generate_proof",
      "proof_type": "kyc",
      "person": "alice",
      "description": "Generate KYC proof for Alice"
    },
    {
      "type": "verify_proof", 
      "proof_type": "kyc",
      "person": "alice",
      "description": "Verify KYC proof for Alice locally"
    },
    {
      "type": "verify_on_ethereum",
      "proof_type": "kyc", 
      "person": "alice",
      "description": "Verify KYC proof for Alice on Ethereum"
    },
    {
      "type": "transfer",
      "amount": "0.05",
      "recipient": "alice",
      "blockchain": "ETH",
      "condition": "kyc_verified",
      "description": "Transfer 0.05 USDC to alice on Ethereum if KYC verified"
    }
  ]
}"""

user_prompt = f"""Parse this command into workflow steps: "{command}"

Remember:
- Each conditional transfer needs proof generation and verification first
- If user says "verify on blockchain" or "on-chain" without specifying which chain, use Ethereum ONLY
- Only add Solana verification if the user explicitly mentions "Solana" or "SOL"
- Handle multiple transfers in one command
- Preserve the exact amounts and blockchain choices
- Use lowercase for person names
- Blockchain verifications happen after local verification
- Default blockchain is Ethereum for both verifications and transfers unless specified

Examples:
- "verify on blockchain" → verify_on_ethereum
- "verify on-chain" → verify_on_ethereum  
- "verify on Solana" → verify_on_solana
- "verify on both chains" → verify_on_ethereum AND verify_on_solana
- "transfer to alice" → transfer on Ethereum (default)
- "transfer to alice on Solana" → transfer on Solana"""

print(f"Testing command: {command}\n")

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ],
    temperature=0.1,
    response_format={"type": "json_object"}
)

result = json.loads(response.choices[0].message.content)
print(json.dumps(result, indent=2))