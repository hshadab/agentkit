#!/usr/bin/env python3
"""
Enhanced OpenAI-based workflow parser with blockchain verification support
"""

import json
import openai
from typing import List, Dict, Any
from openai import OpenAI

class EnhancedOpenAIWorkflowParser:
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)
    
    def parse_workflow(self, command: str) -> Dict[str, Any]:
        """Parse a complex workflow command including blockchain verifications"""
        
        system_prompt = """You are a workflow parser for a zero-knowledge proof and cryptocurrency transfer system.
        
Your task is to parse natural language commands into structured workflow steps.

Available step types:
1. generate_proof: Generate a zero-knowledge proof (kyc, location, ai_content, device_proximity)
2. verify_proof: Verify a previously generated proof locally
3. verify_on_ethereum: Verify a proof on Ethereum blockchain
4. verify_on_solana: Verify a proof on Solana blockchain
5. verify_on_iotex: Verify a device proximity proof on IoTeX blockchain
6. transfer: Send USDC to a recipient on Ethereum or Solana
7. list_proofs: List existing proofs or verifications
8. process_with_ai: Handle any additional AI request (explain, humor, translate, analyze, etc.)
9. register_device: Register an IoT device for proximity verification

Rules:
- Parse ALL commands as workflows, even simple ones like "generate KYC proof"
- If the user asks for ANY additional AI processing (explain, joke, translate, analyze, summarize, etc.), add a process_with_ai step
- For simple proof generation/verification WITHOUT additional requests, just include the action step
- The process_with_ai step should capture the user's specific request (humor, translation, analysis, etc.)
- Only add process_with_ai if the user explicitly asks for something beyond the basic action
- IMPORTANT: "AI prediction proof", "AI content proof", "AI authenticity proof" are PROOF TYPES, NOT requests for AI processing
- NEVER add process_with_ai step for commands like "Prove AI prediction commitment" or "Generate AI content proof" - these are single-step proof generations
- If a transfer has a condition (like "if KYC verified"), you must first generate and verify that proof
- Only add blockchain verification (verify_on_ethereum or verify_on_solana) if explicitly mentioned
- Each person mentioned needs their own proof generation and verification
- Default blockchain for transfers is Ethereum unless specified
- For "list proofs" or "show proofs" commands, use the list_proofs step type

Output format as JSON:
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
      "type": "verify_on_solana",
      "proof_type": "kyc",
      "person": "alice", 
      "description": "Verify KYC proof for Alice on Solana"
    },
    {
      "type": "transfer",
      "amount": "0.05",
      "recipient": "alice",
      "blockchain": "SOL",
      "condition": "kyc_verified",
      "description": "Transfer 0.05 USDC to alice on Solana if KYC verified"
    },
    {
      "type": "process_with_ai",
      "request": "explain how it works",
      "context": "kyc_proof",
      "description": "Process AI request: explain how KYC proofs work"
    }
  ]
}"""

        user_prompt = f"""Parse this command into workflow steps and return as JSON: "{command}"
        
        Important parsing rules:
        - If user says "generate KYC proof and explain how it works", create TWO steps: generate_proof and explain
        - If user says "list proofs", create ONE step: list_proofs (NOT generate_proof)
        - For person names, only add if a specific person is mentioned (e.g., Alice, Bob)
        - Each conditional transfer needs proof generation and verification first
        - Only include blockchain verification steps if explicitly requested
        - Simple workflows like "Generate KYC proof" only need ONE step: generate_proof
        - "AI content", "AI authenticity", or "AI-generated content" refers to proof_type: "ai_content"
        - "Prove AI content authenticity" means generate_proof with proof_type: "ai_content"
        
        Examples:
        - "Generate KYC proof" → one step: generate_proof (proof_type: "kyc")
        - "Prove AI content authenticity" → one step: generate_proof (proof_type: "ai_content")
        - "Prove AI prediction commitment" → one step: generate_proof (proof_type: "ai_content")
        - "Generate AI content proof" → one step: generate_proof (proof_type: "ai_content")
        - "Create AI prediction proof" → one step: generate_proof (proof_type: "ai_content")
        - "Generate location proof for NYC" → one step: generate_proof (proof_type: "location", location: "NYC")
        - "Register IoT device DEV123 with proximity proof" → two steps: register_device (device_id: "DEV123"), generate_proof (proof_type: "device_proximity", device_id: "DEV123")
        - "Register device DEV456 at location 5020,5030" → two steps: register_device (device_id: "DEV456"), generate_proof (proof_type: "device_proximity", device_id: "DEV456", x: "5020", y: "5030")
        - "Register device IOT001 and verify on IoTeX" → three steps: register_device, generate_proof (proof_type: "device_proximity"), verify_on_iotex
        - "Generate KYC proof and explain" → two steps: generate_proof, process_with_ai (request: "explain")
        - "Generate location proof but make it funny" → two steps: generate_proof, process_with_ai (request: "make it funny")
        - "Create AI proof and tell me a joke about it" → two steps: generate_proof, process_with_ai (request: "tell me a joke about it")
        - "List proofs in Spanish" → two steps: list_proofs, process_with_ai (request: "translate to Spanish")
        - "Proof history" → one step: list_proofs
        - "Show proofs" → one step: list_proofs
        - "List all proofs" → one step: list_proofs
        - "Verify proof proof_kyc_1234567890" → one step: verify_proof with proof_id: "proof_kyc_1234567890"
        
        CRITICAL: Do NOT add process_with_ai for these AI proof commands:
        - "Prove AI prediction commitment" - This is a PROOF TYPE, not a request for AI help
        - "Generate AI content proof" - This is a PROOF TYPE, not a request for AI help
        - "Create AI authenticity proof" - This is a PROOF TYPE, not a request for AI help
        
        Special case for verify commands with proof IDs:
        - If the command is "Verify proof [proof_id]" where proof_id starts with "proof_", 
          create a verify_proof step with the proof_id field instead of proof_type"""
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Add indices and additional metadata
            for i, step in enumerate(result.get('steps', [])):
                step['index'] = i
                
                # Add proof_id placeholder for verification steps ONLY if not already present
                if step['type'] in ['verify_proof', 'verify_on_ethereum', 'verify_on_solana']:
                    if 'proof_id' not in step:
                        step['proof_id'] = f"pending_{step.get('proof_type', 'unknown')}_{step.get('person', 'user')}"
            
            return result
            
        except Exception as e:
            print(f"OpenAI parsing error: {e}")
            # Fallback to simple interpretation
            return {
                "description": command,
                "steps": [],
                "error": str(e)
            }
    
    def validate_workflow(self, workflow: Dict[str, Any]) -> bool:
        """Validate that workflow steps make sense"""
        steps = workflow.get('steps', [])
        verified_proofs = set()
        generated_proofs = set()
        
        for step in steps:
            step_type = step.get('type')
            
            if step_type == 'generate_proof':
                proof_key = f"{step.get('proof_type')}_{step.get('person', 'user')}"
                generated_proofs.add(proof_key)
                
            elif step_type in ['verify_proof', 'verify_on_ethereum', 'verify_on_solana']:
                proof_key = f"{step.get('proof_type')}_{step.get('person', 'user')}"
                
                # Check if proof was generated first
                if proof_key not in generated_proofs:
                    print(f"Warning: Attempting to verify {proof_key} before generation")
                    return False
                    
                if step_type == 'verify_proof':
                    verified_proofs.add(proof_key)
                    
            elif step_type == 'transfer':
                condition = step.get('condition')
                
                # Check if required verification was done
                if condition and 'verified' in condition:
                    person = step.get('recipient', 'user')
                    proof_type = condition.replace('_verified', '')
                    proof_key = f"{proof_type}_{person}"
                    
                    if proof_key not in verified_proofs and proof_key not in generated_proofs:
                        print(f"Warning: Transfer condition {condition} not satisfied")
                        return False
        
        return True

def test_parser():
    """Test the enhanced parser with sample commands"""
    parser = EnhancedOpenAIWorkflowParser(api_key="test")
    
    test_commands = [
        "Generate KYC proof, verify it on blockchain, then send 0.1 USDC to Alice on Ethereum",
        "Generate location proof and verify on Solana, then transfer 0.05 USDC to Bob",
        "Generate AI content proof, verify locally and on Ethereum, then send 0.2 USDC to Charlie on Solana"
    ]
    
    for cmd in test_commands:
        print(f"\nCommand: {cmd}")
        # In real usage, this would call OpenAI
        print("Would parse into workflow steps...")

if __name__ == "__main__":
    test_parser()