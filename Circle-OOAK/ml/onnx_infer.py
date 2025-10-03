from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Tuple

import numpy as np

# Allow import when run as a script from folder
_HERE = Path(__file__).resolve().parent
_ROOT = _HERE.parents[2]
import os as _os
OOAK_ONNX_MODEL = _os.getenv("OOAK_ONNX_MODEL", str((_ROOT / "jolt-atlas/models/agent_classifier.onnx").resolve()))


@dataclass
class InferenceResult:
    decision: int  # 1 = APPROVE, 0 = DENY
    confidence: int  # 0-100
    raw_output: Any
    model_path: str


def _maybe_generate_demo_model() -> None:
    model_path = Path(OOAK_ONNX_MODEL)
    if model_path.exists():
        return

    # Use jolt-atlas script to generate a tiny classifier
    script = model_path.parents[0] / "create_agent_classifier.py"
    if not script.exists():
        raise FileNotFoundError(
            f"Expected ONNX generator script missing: {script}. Set OOAK_ONNX_MODEL or provide model."
        )

    subprocess.run(["python3", str(script)], check=True, cwd=str(model_path.parents[2]))
    if not model_path.exists():
        raise RuntimeError("Failed to generate demo ONNX model")


def run_inference(features: Dict[str, Any]) -> InferenceResult:
    """Run real ONNX inference using onnxruntime.

    Expected model: a simple classifier that returns a class/logit. We map it to (decision, confidence).
    If absent, we auto-generate a demo model from jolt-atlas.
    """
    _maybe_generate_demo_model()

    import onnxruntime as ort  # Local import so module loads without hard dep

    model_path = str(OOAK_ONNX_MODEL)
    sess = ort.InferenceSession(model_path)

    # Prepare a tiny fixed input consistent with demo model expectations
    # For the demo agent_classifier.onnx, we expect a vector of 4-5 scalars.
    x = np.array([
        float(features.get("amount_norm", 0.2)),
        float(features.get("risk_score", 0.1)),
        float(features.get("op_code", 1.0)),
        float(features.get("bias", 1.0)),
    ], dtype=np.float32).reshape(1, -1)

    inputs = {sess.get_inputs()[0].name: x}
    outputs = sess.run(None, inputs)

    y = np.asarray(outputs[0]).flatten()
    score = float(y[0]) if len(y) > 0 else 0.0

    # Map score to decision/confidence for the Groth16 circuit
    decision = 1 if score >= 0.5 else 0
    confidence = int(max(0, min(100, round(abs(score - 0.5) * 200))))

    return InferenceResult(
        decision=decision,
        confidence=confidence,
        raw_output=outputs,
        model_path=model_path,
    )
