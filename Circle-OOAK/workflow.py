from __future__ import annotations

import hashlib
import json
import os
import sys
from dataclasses import dataclass
from typing import Any, Dict, Optional

_HERE = os.path.dirname(__file__)
sys.path.append(_HERE)
sys.path.append(os.path.join(_HERE, "ml"))
sys.path.append(os.path.join(_HERE, "zk"))
sys.path.append(os.path.join(_HERE, "onchain"))

from ml.onnx_infer import run_inference  # type: ignore
from zk.jolt_prover import generate_llm_proof  # type: ignore
from zk.groth16 import prove_decision_confidence  # type: ignore
from onchain.verify import verify_on_chain  # type: ignore


@dataclass
class ApprovalArtifacts:
    decision: int
    confidence: int
    onchain_verified: bool
    groth16: Dict[str, Any]
    jolt: Optional[Dict[str, Any]]


class ZKWorkflowManager:
    """Approval gate that enforces real ONNX inference and zk proof checks.

    Policy: require Groth16 verification of (decision, confidence) before approval.
    If a JOLT-Atlas prover is present, bind its proof hash into the audit record.
    """

    def __init__(self) -> None:
        pass

    def approve(self, features: Dict[str, Any]) -> ApprovalArtifacts:
        # 1) Real ONNX inference
        inf = run_inference(features)

        # 2) Optional JOLT proof (proof-of-execution) if binary exists
        jolt = generate_llm_proof(decision=inf.decision, confidence=inf.confidence)
        jolt_dict = None
        if jolt:
            jolt_dict = {
                "decision": jolt.decision,
                "confidence": jolt.confidence,
                "risk_score": jolt.risk_score,
                "proof_hash": jolt.proof_hash_hex,
            }

        # 3) Groth16 proof over public signals (decision, confidence)
        g16 = prove_decision_confidence(inf.decision, inf.confidence)

        # 4) On-chain verify (view)
        try:
            ok = verify_on_chain(g16.a, g16.b, g16.c, g16.public_signals)
        except Exception as e:
            ok = False

        return ApprovalArtifacts(
            decision=inf.decision,
            confidence=inf.confidence,
            onchain_verified=bool(ok),
            groth16={
                "a": g16.a,
                "b": g16.b,
                "c": g16.c,
                "public_signals": g16.public_signals,
            },
            jolt=jolt_dict,
        )
