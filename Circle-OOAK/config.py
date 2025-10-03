import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _default(path: str) -> str:
    return str((ROOT / path).resolve())


OOAK_ONNX_MODEL = os.getenv(
    "OOAK_ONNX_MODEL",
    _default("jolt-atlas/models/agent_classifier.onnx"),
)

OOAK_CIRCUIT_DIR = os.getenv(
    "OOAK_CIRCUIT_DIR",
    _default("circuits/jolt-verifier"),
)

OOAK_RPC_URL = os.getenv(
    "OOAK_RPC_URL",
    "https://eth-sepolia.public.blastapi.io",
)

# Demo verifier address used by repo’s JS backend; override in prod
OOAK_VERIFIER_ADDRESS = os.getenv(
    "OOAK_VERIFIER_ADDRESS",
    "0x1279FEDc2A21Ae16dC6bfE2bE0B89175f98BD308",
)

# Optional path to JOLT-Atlas prover binary
JOLT_PROVER_BIN = os.getenv(
    "JOLT_PROVER_BIN",
    _default("jolt-atlas/target/release/llm_prover"),
)


def ensure_dirs():
    Path(OOAK_CIRCUIT_DIR).mkdir(parents=True, exist_ok=True)

