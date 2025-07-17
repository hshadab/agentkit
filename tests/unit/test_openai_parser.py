#!/usr/bin/env python3
"""Test OpenAI workflow parser"""

import os
import json
import asyncio
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

async def test_parser():
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("ERROR: OPENAI_API_KEY not set")
        return
        
    client = AsyncOpenAI(api_key=api_key)
    
    command = "If Alice is KYC verified send her 0.05 USDC on Solana and if Bob is KYC verified send him 0.03 USDC on Ethereum"
    
    system_prompt = """You are a workflow parser for a blockchain system that handles conditional transfers and proof generation.

Parse the user's command into a structured workflow with steps. Each step should be one of:
1. Proof generation (kyc_proof, location_proof, ai_content_proof)
2. Verification (verify a specific proof)
3. Transfer (send USDC to someone on ETH or SOL blockchain)

For conditional transfers like "If Alice is KYC verified send her 0.05 USDC on Solana", break it into:
1. Generate KYC proof for Alice (type: "kyc_proof")
2. Verify the KYC proof for Alice (type: "verification")
3. Transfer 0.05 USDC to Alice on SOL (type: "transfer")

Return the result as a JSON object with this structure:
{
  "description": "original command",
  "steps": [
    {
      "index": 0,
      "type": "kyc_proof|location_proof|ai_content_proof|verification|transfer",
      "proofType": "kyc|location|ai content" (for proof steps),
      "verificationType": "kyc|location|ai content" (for verification steps),
      "description": "human readable description",
      "person": "alice|bob|etc" (if applicable),
      "amount": "0.05" (for transfers),
      "recipient": "alice|bob|etc" (for transfers),
      "blockchain": "ETH|SOL" (for transfers, default ETH),
      "requiresProof": true (for conditional transfers),
      "requiredProofTypes": ["kyc"] (for conditional transfers),
      "conditions": [{"type": "kyc", "description": "KYC verified"}] (for conditional transfers)
    }
  ],
  "requiresProofs": true (if any transfers require proofs)
}"""

    print(f"Testing command: {command}")
    print("\nCalling OpenAI API...")
    
    try:
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Parse this workflow command: {command}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1000
        )
        
        result = json.loads(response.choices[0].message.content)
        print("\nParsed result:")
        print(json.dumps(result, indent=2))
        
        # Validate
        print(f"\nTotal steps: {len(result.get('steps', []))}")
        for step in result.get('steps', []):
            print(f"  {step['index']+1}. {step['type']}: {step['description']}")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(test_parser())