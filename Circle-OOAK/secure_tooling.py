from __future__ import annotations

from functools import wraps
from typing import Any, Callable, Dict, Optional

from workflow import ZKWorkflowManager


class ZKGateFailed(Exception):
    pass


def secure_tool(features_fn: Callable[[tuple, dict], Dict[str, Any]], require_zk: bool = True):
    """Minimal @secure_tool-style decorator with zk gate.

    - features_fn: maps (args, kwargs) of the tool to a feature dict for inference/proof.
    - require_zk: if True, enforces on-chain verification before executing the tool.
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            if not require_zk:
                return func(*args, **kwargs)

            features = features_fn(args, kwargs)
            mgr = ZKWorkflowManager()
            result = mgr.approve(features)

            if not result.onchain_verified:
                raise ZKGateFailed("On-chain verification failed; aborting secure action")

            # Attach artifacts for downstream auditing (pattern similar to OOAK intent binding)
            kwargs["_zk_artifacts"] = {
                "decision": result.decision,
                "confidence": result.confidence,
                "groth16": result.groth16,
                "jolt": result.jolt,
            }
            return func(*args, **kwargs)

        return wrapper

    return decorator
