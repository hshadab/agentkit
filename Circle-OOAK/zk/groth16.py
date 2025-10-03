from __future__ import annotations

import json
import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple

_HERE = Path(__file__).resolve().parent
_ROOT = _HERE.parents[2]
OOAK_CIRCUIT_DIR = os.getenv("OOAK_CIRCUIT_DIR", str((_ROOT / "circuits/jolt-verifier").resolve()))


@dataclass
class Groth16Proof:
    a: List[int]
    b: List[List[int]]
    c: List[int]
    public_signals: List[int]
    raw_proof: Dict[str, Any]


def _require_paths() -> Tuple[Path, Path, Path, Path, Path]:
    root = Path(OOAK_CIRCUIT_DIR)
    wasm = root / "jolt_decision_simple_js" / "jolt_decision_simple.wasm"
    gen_wit = root / "jolt_decision_simple_js" / "generate_witness.js"
    zkey = root / "jolt_decision_simple_final.zkey"
    proof_path = root / "proof_onchain.json"
    public_path = root / "public_onchain.json"
    for p in [wasm, gen_wit, zkey]:
        if not p.exists():
            raise FileNotFoundError(f"Missing circuit asset: {p}")
    return wasm, gen_wit, zkey, proof_path, public_path


def _ensure_snarkjs() -> str:
    # Prefer global snarkjs if present; else try npx
    if shutil.which("snarkjs"):
        return "snarkjs"
    return "npx snarkjs"


def prove_decision_confidence(decision: int, confidence: int) -> Groth16Proof:
    wasm, gen_wit, zkey, proof_path, public_path = _require_paths()

    input_obj = {"decision": str(int(decision)), "confidence": str(int(confidence))}
    input_path = proof_path.parent / "input_onchain.json"
    input_path.write_text(json.dumps(input_obj))

    # 1) Generate witness
    subprocess.run(
        ["node", str(gen_wit), str(wasm), str(input_path), str(proof_path.parent / "witness_onchain.wtns")],
        check=True,
    )

    # 2) Generate proof
    snark = _ensure_snarkjs().split()
    subprocess.run(
        snark + [
            "groth16", "prove",
            str(zkey),
            str(proof_path.parent / "witness_onchain.wtns"),
            str(proof_path),
            str(public_path),
        ],
        check=True,
    )

    proof = json.loads(proof_path.read_text())
    public = json.loads(public_path.read_text())

    # Format for Solidity
    a = [int(proof["pi_a"][0]), int(proof["pi_a"][1])]
    b = [
        [int(proof["pi_b"][0][1]), int(proof["pi_b"][0][0])],
        [int(proof["pi_b"][1][1]), int(proof["pi_b"][1][0])],
    ]
    c = [int(proof["pi_c"][0]), int(proof["pi_c"][1])]
    public_signals = [int(x) for x in public]

    return Groth16Proof(a=a, b=b, c=c, public_signals=public_signals, raw_proof=proof)
