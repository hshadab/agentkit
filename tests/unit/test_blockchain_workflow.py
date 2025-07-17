#!/usr/bin/env python3
"""Test blockchain verification in workflows"""

import json
import requests
import time

# Test command with blockchain verification
test_command = "Generate KYC proof, verify it on Ethereum and Solana, then send 0.1 USDC to Alice on Ethereum"

print(f"Testing workflow: {test_command}")

# Send workflow request
response = requests.post(
    "http://localhost:8000/execute_workflow",
    json={"command": test_command},
    headers={"Content-Type": "application/json"}
)

if response.status_code == 200:
    result = response.json()
    print(f"\nWorkflow Result:")
    print(json.dumps(result, indent=2))
else:
    print(f"Error: {response.status_code}")
    print(response.text)