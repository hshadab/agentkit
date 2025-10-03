from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_HERE = Path(__file__).resolve().parent
_ROOT = _HERE.parents[2]

# Allow pointing to an Option-B style circuit with 3 public signals: [decision, confidence, proofHash]
BINDING_CIRCUIT_DIR = os.getenv("OOAK_BINDING_CIRCUIT_DIR", str((_ROOT / "x402/circuits/option-b-v2").resolve()))


@dataclass
class Groth16BindingProof:
    a: List[int]
    b: List[List[int]]
    c: List[int]
    public_signals: List[int]  # [decision, confidence, proofHashF]
    raw_proof: Dict[str, Any]


def _require_binding_paths() -> Tuple[Path, Path, Path, Path, Path]:
    root = Path(BINDING_CIRCUIT_DIR)
    wasm = root / "decision_with_binding_js" / "decision_with_binding.wasm"
    gen_wit = root / "decision_with_binding_js" / "generate_witness.js"
    zkey = root / "decision_with_binding_final.zkey"
    proof_path = root / "proof_binding.json"
    public_path = root / "public_binding.json"
    for p in [wasm, gen_wit, zkey]:
        if not p.exists():
            raise FileNotFoundError(
                f"Missing binding circuit asset: {p}. Set OOAK_BINDING_CIRCUIT_DIR to compiled assets."
            )
    return wasm, gen_wit, zkey, proof_path, public_path


def _ensure_snarkjs() -> str:
    if shutil.which("snarkjs"):
        return "snarkjs"
    return "npx snarkjs"


def _hash_to_field(proof_bytes: bytes) -> int:
    # BN254 field order
    r = 21888242871839275222246405745257275088548364400416034343698204186575808495617
    h = hashlib.sha256(proof_bytes).digest()
    return int.from_bytes(h, "big") % r


def prove_with_binding(decision: int, confidence: int, proof_bytes: Optional[bytes]) -> Groth16BindingProof:
    wasm, gen_wit, zkey, proof_path, public_path = _require_binding_paths()

    proof_hash_f = 0
    if proof_bytes:
        proof_hash_f = _hash_to_field(proof_bytes)

    input_obj = {
        "decision": str(int(decision)),
        "confidence": str(int(confidence)),
        "proofHash": str(int(proof_hash_f)),
    }
    input_path = proof_path.parent / "input_binding.json"
    input_path.write_text(json.dumps(input_obj))

    # 1) Generate witness
    subprocess.run(
        ["node", str(gen_wit), str(wasm), str(input_path), str(proof_path.parent / "witness_binding.wtns")],
        check=True,
    )

    # 2) Generate proof
    snark = _ensure_snarkjs().split()
    subprocess.run(
        snark + [
            "groth16", "prove",
            str(zkey),
            str(proof_path.parent / "witness_binding.wtns"),
            str(proof_path),
            str(public_path),
        ],
        check=True,
    )

    proof = json.loads(proof_path.read_text())
    public = json.loads(public_path.read_text())

    a = [int(proof["pi_a"][0]), int(proof["pi_a"][1])]
    b = [
        [int(proof["pi_b"][0][1]), int(proof["pi_b"][0][0])],
        [int(proof["pi_b"][1][1]), int(proof["pi_b"][1][0])],
    ]
    c = [int(proof["pi_c"][0]), int(proof["pi_c"][1])]
    public_signals = [int(x) for x in public]

    return Groth16BindingProof(a=a, b=b, c=c, public_signals=public_signals, raw_proof=proof)

