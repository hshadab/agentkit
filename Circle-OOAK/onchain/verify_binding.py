from __future__ import annotations

import json
import os
from pathlib import Path
from typing import List

from web3 import Web3

# ABI compatible with x402 option-b 3-signal verifier: uint256[3] pub signals
ABI_VERIFY_3SIG = [
    {
        "inputs": [
            {"internalType": "uint256[2]", "name": "_pA", "type": "uint256[2]"},
            {"internalType": "uint256[2][2]", "name": "_pB", "type": "uint256[2][2]"},
            {"internalType": "uint256[2]", "name": "_pC", "type": "uint256[2]"},
            {"internalType": "uint256[3]", "name": "_pubSignals", "type": "uint256[3]"},
        ],
        "name": "verifyProof",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    }
]


def verify_on_chain_binding(
    a: List[int], b: List[List[int]], c: List[int], pub3: List[int], *,
    rpc_url: str | None = None, verifier_address: str | None = None
) -> bool:
    rpc = rpc_url or os.getenv("OOAK_RPC_URL", "https://eth-sepolia.public.blastapi.io")
    addr = verifier_address or os.getenv("OOAK_BINDING_VERIFIER_ADDRESS")
    if not addr:
        raise ValueError("Set OOAK_BINDING_VERIFIER_ADDRESS to the 3-signal verifier contract address")
    w3 = Web3(Web3.HTTPProvider(rpc))
    contract = w3.eth.contract(address=Web3.to_checksum_address(addr), abi=ABI_VERIFY_3SIG)
    return contract.functions.verifyProof(a, b, c, pub3).call()

