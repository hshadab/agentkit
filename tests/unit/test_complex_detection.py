#\!/usr/bin/env python3
import sys
sys.path.append('/home/hshadab/agentkit')
from chat_service import is_complex_workflow

test_commands = [
    "If Charlie is KYC verified on-chain, send him 0.2 USDC on Ethereum",
    "Generate KYC proof for Alice, verify it on blockchain, then send 0.1 USDC to Alice",
    "If Frank is KYC compliant and verified on Ethereum, send him 0.25 USDC",
    "When Emma's KYC is verified on the blockchain, transfer 0.3 USDC to her wallet",
    "Generate location proof, verify it on Solana, then transfer 0.05 USDC to Bob",
]

print("Testing is_complex_workflow() function")
print("=" * 60)

for cmd in test_commands:
    result = is_complex_workflow(cmd)
    status = "✓ Complex" if result else "✗ Simple"
    print(f"\n{status}: {cmd}")
EOF < /dev/null
