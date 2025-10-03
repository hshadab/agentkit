from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

import os as _os
_HERE = Path(__file__).resolve().parent
_ROOT = _HERE.parents[2]
JOLT_PROVER_BIN = _os.getenv("JOLT_PROVER_BIN", str((_ROOT / "jolt-atlas/target/release/llm_prover").resolve()))


@dataclass
class JoltProof:
    decision: int
    confidence: int
    risk_score: int
    proof_bytes: bytes
    proof_hash_hex: str
    raw: Dict[str, Any]


def _bin_exists(path: str) -> bool:
    p = Path(path)
    return p.exists() and p.is_file()


def generate_llm_proof(decision: int, confidence: int) -> Optional[JoltProof]:
    """Call the JOLT-Atlas `llm_prover` if available to produce a proof artifact.

    Returns None if the binary is unavailable, but the Groth16 path can still proceed.
    """
    if not _bin_exists(JOLT_PROVER_BIN):
        return None

    # Map demo inputs to the prover’s CLI parameters
    args = [
        JOLT_PROVER_BIN,
        "--prompt_hash", "12345",
        "--system_rules_hash", "67890",
        "--context_window", "2048",
        "--temperature", "0",
        "--model_checkpoint", "1337",
        "--approve_confidence", str(confidence),
        "--amount_confidence", "80",
        "--rules_attention", "90",
        "--amount_attention", "85",
        "--reasoning_hash", "99999",
        "--format_valid", "1",
        "--amount_valid", "1",
        "--recipient_valid", "1",
        "--decision", str(int(decision)),
        "--output", "llm_proof.json",
    ]

    proc = subprocess.run(args, check=True, capture_output=True, text=True, cwd=str(Path(JOLT_PROVER_BIN).parents[2]))
    stdout = proc.stdout

    # Extract JSON between markers
    start = stdout.find("===PROOF_START===")
    end = stdout.find("===PROOF_END===")
    if start == -1 or end == -1:
        # Fallback to file
        proof_path = Path(JOLT_PROVER_BIN).parents[2] / "llm_proof.json"
        raw = json.loads(proof_path.read_text()) if proof_path.exists() else {}
    else:
        raw = json.loads(stdout[start + len("===PROOF_START==="): end].strip())

    # Compute proof hash
    proof_bytes = bytes(raw.get("proof_bytes", [])) if isinstance(raw.get("proof_bytes"), list) else json.dumps(raw).encode()
    h = hashlib.sha256(proof_bytes).hexdigest()

    return JoltProof(
        decision=int(raw.get("decision", decision)),
        confidence=int(raw.get("confidence", confidence)),
        risk_score=int(raw.get("risk_score", max(0, 100 - confidence))),
        proof_bytes=proof_bytes,
        proof_hash_hex=h,
        raw=raw,
    )
