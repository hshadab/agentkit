#!/usr/bin/env python3
"""
Fast-path parser for simple workflow commands that don't need OpenAI
"""

import re
from typing import Dict, Any, Optional

class SimpleWorkflowParser:
    """Parse simple single-step commands without OpenAI API calls"""
    
    def __init__(self):
        # Patterns for simple proof generation
        self.proof_patterns = {
            'kyc': r'(?:generate|create|prove)\s+kyc\s*(?:proof)?',
            'location': r'(?:generate|create|prove)\s+location\s*(?:proof)?',
            'ai_content': r'(?:generate|create|prove)\s+ai\s*(?:content)?\s*(?:proof)?',
        }
        
        # Pattern for verification
        self.verify_pattern = r'verify\s+(?:proof\s+)?([a-zA-Z0-9_-]+)'
        
        # Pattern for list/history
        self.list_pattern = r'(?:list|show|history)\s+(?:proofs?|verifications?)'
    
    def can_parse_simple(self, command: str) -> bool:
        """Check if this command can be parsed without OpenAI"""
        command_lower = command.lower().strip()
        
        # Check if it's a simple proof generation
        for proof_type in self.proof_patterns.values():
            if re.match(proof_type, command_lower):
                return True
        
        # Check if it's a simple verification
        if re.match(self.verify_pattern, command_lower):
            return True
            
        # Check if it's a list command
        if re.match(self.list_pattern, command_lower):
            return True
            
        return False
    
    def parse_simple(self, command: str) -> Optional[Dict[str, Any]]:
        """Parse simple commands into workflow format"""
        command_lower = command.lower().strip()
        
        # Check for proof generation
        for proof_type, pattern in self.proof_patterns.items():
            if re.match(pattern, command_lower):
                return {
                    "description": command,
                    "steps": [{
                        "type": "generate_proof",
                        "proof_type": proof_type,
                        "person": "user",
                        "description": f"Generate {proof_type} proof",
                        "index": 0
                    }],
                    "requiresProofs": True,
                    "simple": True
                }
        
        # Check for verification
        verify_match = re.match(self.verify_pattern, command_lower)
        if verify_match:
            proof_id = verify_match.group(1)
            return {
                "description": command,
                "steps": [{
                    "type": "verify_proof",
                    "proof_id": proof_id,
                    "description": f"Verify proof {proof_id}",
                    "index": 0
                }],
                "requiresProofs": True,
                "simple": True
            }
        
        # Check for list/history
        if re.match(self.list_pattern, command_lower):
            list_type = "verifications" if "verification" in command_lower else "proofs"
            return {
                "description": command,
                "steps": [{
                    "type": "list_proofs",
                    "list_type": list_type,
                    "description": f"List {list_type}",
                    "index": 0
                }],
                "requiresProofs": False,
                "simple": True
            }
        
        return None

# Example usage
if __name__ == "__main__":
    parser = SimpleWorkflowParser()
    
    test_commands = [
        "Generate KYC proof",
        "Create location proof", 
        "Verify proof_kyc_1234",
        "List proofs",
        "Show verification history",
        "Generate KYC proof then send 0.1 USDC to Alice",  # Should return None
    ]
    
    for cmd in test_commands:
        if parser.can_parse_simple(cmd):
            result = parser.parse_simple(cmd)
            print(f"\nCommand: {cmd}")
            print(f"Can parse: Yes")
            print(f"Result: {result}")
        else:
            print(f"\nCommand: {cmd}")
            print(f"Can parse: No (needs OpenAI)")