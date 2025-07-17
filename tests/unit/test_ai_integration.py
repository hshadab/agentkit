#!/usr/bin/env python3
import requests
import json

# Test the AI + ZKP integration
test_cases = [
    {
        "desc": "Simple proof (no AI)",
        "command": "Generate KYC proof",
        "expected_ai": False
    },
    {
        "desc": "Proof with humor",
        "command": "Generate KYC proof and tell me a dad joke about zero-knowledge proofs",
        "expected_ai": True
    },
    {
        "desc": "Proof with translation", 
        "command": "Create location proof then translate the result to Spanish",
        "expected_ai": True
    },
    {
        "desc": "Proof with analysis",
        "command": "Generate AI content proof, then analyze its cryptographic security",
        "expected_ai": True
    },
    {
        "desc": "List with creativity",
        "command": "List all my proofs and write a haiku about them",
        "expected_ai": True
    }
]

print("Testing AI + ZKP Integration")
print("=" * 50)
print()

for test in test_cases:
    print(f"Test: {test['desc']}")
    print(f"Command: {test['command']}")
    
    # Test the parser
    response = requests.post(
        "http://localhost:8002/test_parser",
        json={"command": test['command']}
    )
    
    if response.status_code == 200:
        result = response.json()
        if result.get('success') and result.get('parsed_result'):
            steps = result['parsed_result'].get('steps', [])
            has_ai = any(step.get('type') == 'process_with_ai' for step in steps)
            
            print(f"Steps parsed: {len(steps)}")
            for step in steps:
                print(f"  - {step['type']}: {step.get('description', '')}")
                if step['type'] == 'process_with_ai':
                    print(f"    AI Request: {step.get('request', 'N/A')}")
            
            if has_ai == test['expected_ai']:
                print("✓ AI processing detected correctly")
            else:
                print(f"✗ Expected AI: {test['expected_ai']}, Got: {has_ai}")
    else:
        print(f"✗ API Error: {response.status_code}")
    
    print("-" * 50)
    print()

print("\nConclusion:")
print("The system should:")
print("1. Parse simple commands without AI processing")
print("2. Detect and include AI processing when requested")
print("3. Support various AI requests: humor, translation, analysis, etc.")
print("4. Keep the ZKP operations separate from AI enhancements")