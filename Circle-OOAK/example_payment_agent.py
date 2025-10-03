from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

from secure_tooling import secure_tool


def _payment_features(args: tuple, kwargs: dict) -> Dict[str, Any]:
    amount = float(kwargs.get("amount", 0))
    # Simple mapping to normalized features (domain-specific mapping can be improved)
    return {
        "amount_norm": min(1.0, max(0.0, amount / 1000.0)),  # normalize against 1000 unit budget
        "risk_score": float(kwargs.get("risk_score", 0.1)),
        "op_code": 1.0,  # payment op
        "bias": 1.0,
    }


@dataclass
class PaymentAgent:
    name: str

    @secure_tool(features_fn=_payment_features, require_zk=True)
    def send_usdc(self, sender: str, receiver: str, amount: float, *, _zk_artifacts: Dict[str, Any] | None = None) -> str:
        # In production, this would call Circle APIs/SDKs or chain directly.
        # Here we simulate the transfer and surface the zk artifacts for downstream logging.
        print(f"[secure_tool] ZK gate passed: decision={_zk_artifacts['decision']} confidence={_zk_artifacts['confidence']}%")
        print(f"[secure_tool] Groth16 calldata: a={_zk_artifacts['groth16']['a']} ...")
        if _zk_artifacts.get("jolt"):
            print(f"[secure_tool] JOLT proof hash: {_zk_artifacts['jolt']['proof_hash']}")
        print(f"Sending {amount} USDC from {sender} to {receiver} ...")
        # Return a mock tx hash to show success
        return "0xzk-approved-mock-txhash"


if __name__ == "__main__":
    agent = PaymentAgent(name="ZK-Gated Agent")
    tx = agent.send_usdc("0x1111", "0x2222", amount=25.0, risk_score=0.05)
    print(f"Transfer complete. tx={tx}")
