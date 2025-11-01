# RFC: zkML Authorization Extension for Agentic Checkout

**Status:** Proposal
**Version:** 2025-09-30
**Scope:** Optional cryptographic proof of authorization for agent commerce
**Authors:** NovaNet (reference implementation)

---

## 1. Overview

This RFC proposes an **optional extension** to the Agentic Checkout Specification (ACS) that enables merchants to receive cryptographic proofs that AI agents correctly evaluated user spending rules before initiating payments.

### 1.1 Problem Statement

Current ACP implementations rely on **trust** that:
1. The AI agent correctly interpreted user spending rules
2. The authorization decision was computed properly
3. The agent is acting within user-defined constraints

For high-value transactions or regulated industries, this "trust model" creates:
- **Liability risk**: Who is responsible if an agent makes an unauthorized purchase?
- **Audit challenges**: No cryptographic proof of authorization decisions
- **User hesitation**: Users may limit agent autonomy due to lack of verifiable controls

### 1.2 Solution: zkML Proofs

**Zero-Knowledge Machine Learning (zkML)** provides cryptographic proofs that:
- ✅ An authorization model ran with specific inputs
- ✅ The computation was performed correctly
- ✅ The decision output is verifiable
- ✅ Without revealing the model internals or sensitive user data

### 1.3 Goals

- **Optional**: zkML proofs are OPTIONAL; standard ACP works without them
- **Backward compatible**: No breaking changes to existing ACP implementations
- **Agent-agnostic**: Works with any AI agent (Claude, GPT, custom, etc.)
- **Verifiable**: Merchants can independently verify proofs
- **Privacy-preserving**: Zero-knowledge properties protect user data

### 1.4 Non-Goals

- **Not required**: Merchants MAY choose to ignore authorization proofs
- **Not authentication**: Proofs verify computation, not agent identity
- **Not payment**: Proof generation is separate from payment settlement

---

## 2. Protocol Extension

### 2.1 New Optional Field: `authorization_proof`

Add optional `authorization_proof` object to `CheckoutSession`:

```json
{
  "id": "cs_123",
  "status": "ready_for_payment",
  "authorization_proof": {
    "proof": "0xjolt_real_4a4f4c54016400b0...",
    "proof_hash": "de187607a89b2017528c91760d6b61e6...",
    "proof_system": "jolt-atlas",
    "model_hash": "sha256:a7f3bc9...",
    "decision": true,
    "confidence": 0.99,
    "inputs_hash": "sha256:8f2e1d4...",
    "timestamp": 1727683200000,
    "verification_url": "https://basescan.org/tx/0xabc..."
  }
}
```

### 2.2 Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `proof` | string | **YES** | Hex-encoded zkML proof bytes |
| `proof_hash` | string | **YES** | SHA-256 hash of proof for integrity |
| `proof_system` | string | **YES** | Proof system identifier (e.g., "jolt-atlas", "groth16") |
| `model_hash` | string | **YES** | Hash of authorization model used |
| `decision` | boolean | **YES** | Authorization decision (true = approved) |
| `confidence` | number | **YES** | Confidence score (0.0-1.0) |
| `inputs_hash` | string | **YES** | Hash of model inputs for verification |
| `timestamp` | integer | **YES** | Unix timestamp (milliseconds) of proof generation |
| `verification_url` | string | NO | Optional on-chain verification transaction URL |

### 2.3 JSON Schema Addition

```json
{
  "$defs": {
    "AuthorizationProof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "proof": { "type": "string" },
        "proof_hash": { "type": "string" },
        "proof_system": {
          "type": "string",
          "enum": ["jolt-atlas", "groth16", "plonk", "stark"]
        },
        "model_hash": { "type": "string" },
        "decision": { "type": "boolean" },
        "confidence": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0
        },
        "inputs_hash": { "type": "string" },
        "timestamp": { "type": "integer" },
        "verification_url": { "type": "string", "format": "uri" }
      },
      "required": [
        "proof",
        "proof_hash",
        "proof_system",
        "model_hash",
        "decision",
        "confidence",
        "inputs_hash",
        "timestamp"
      ]
    },
    "CheckoutSessionBase": {
      "type": "object",
      "properties": {
        ...
        "authorization_proof": {
          "$ref": "#/$defs/AuthorizationProof"
        }
      }
    }
  }
}
```

---

## 3. Workflow Integration

### 3.1 Standard ACP Flow (No zkML)
```
AI Agent → Create Checkout → Payment → Complete
```

### 3.2 Enhanced Flow with zkML
```
AI Agent → Evaluate Rules → Generate Proof → Create Checkout (+ proof) → Payment → Complete
                ↓
         Merchant can verify proof
```

### 3.3 Sequence Diagram

```
┌──────────┐      ┌──────────────┐      ┌─────────────┐      ┌─────────┐
│ AI Agent │      │ zkML Service │      │   Merchant  │      │  User   │
└────┬─────┘      └──────┬───────┘      └──────┬──────┘      └────┬────┘
     │                   │                     │                  │
     │ 1. Get user rules │                     │                  │
     │───────────────────┼─────────────────────┼─────────────────>│
     │                   │                     │                  │
     │ 2. Request authorization proof          │                  │
     │──────────────────>│                     │                  │
     │                   │ 3. Run model        │                  │
     │                   │    + Generate proof │                  │
     │ 4. Proof response │                     │                  │
     │<──────────────────│                     │                  │
     │                   │                     │                  │
     │ 5. POST /checkout_sessions (+ proof)    │                  │
     │────────────────────────────────────────>│                  │
     │                   │                     │ 6. (Optional)    │
     │                   │                     │    Verify proof  │
     │                   │                     │                  │
     │ 7. Session created (ready_for_payment)  │                  │
     │<────────────────────────────────────────│                  │
```

---

## 4. Implementation Guidelines

### 4.1 For AI Agent Providers

**Optional Implementation Steps**:

1. **User Rule Configuration**: Allow users to define spending rules
2. **Authorization Service**: Implement authorization logic (e.g., budget checks)
3. **zkML Integration**: Use proof system (JOLT-Atlas, Groth16, etc.)
4. **Proof Binding**: Attach `authorization_proof` to checkout session creation

**Recommended Proof Systems**:
- **JOLT-Atlas**: Fast (500ms), compact (262 bytes), good for real-time
- **Groth16**: Smaller proofs, on-chain verification, higher setup cost
- **PLONK/STARK**: Universal setup, larger proofs, flexible

### 4.2 For Merchants

**Proof Verification Options**:

1. **Trust the proof hash**: Simply log `proof_hash` for audit trail
2. **Verify locally**: Run proof verification algorithm client-side
3. **Verify on-chain**: Check `verification_url` for blockchain confirmation
4. **Risk-based**: Only verify proofs above certain transaction thresholds

**No Action Required**:
- Merchants can ignore `authorization_proof` field entirely
- Standard payment flow continues unchanged

### 4.3 For Payment Processors

**Metadata Enhancement**:
- Store `proof_hash` in payment intent metadata
- Enable chargeback protection with cryptographic proof
- Provide audit API for proof retrieval

---

## 5. Security & Privacy Considerations

### 5.1 Zero-Knowledge Properties

zkML proofs provide:
- **Computational integrity**: Proof that computation ran correctly
- **Privacy**: Model parameters and user data remain private
- **Verifiability**: Anyone can verify proof without re-running computation

### 5.2 Threat Model

**Protections**:
- ✅ Agent cannot forge authorization decisions
- ✅ Merchant can verify proof independently
- ✅ On-chain audit trail (testnet)

**Not Protected**:
- ❌ Agent identity spoofing (use existing API auth)
- ❌ User device compromise (outside protocol scope)
- ❌ Model backdoors (model auditing required separately)

### 5.3 Privacy Guarantees

The proof reveals ONLY:
- Authorization decision (approve/deny)
- Confidence score
- Model hash (not the model itself)
- Inputs hash (not the actual inputs)

User spending rules and transaction details remain private.

---

## 6. Performance Considerations

### 6.1 Proof Generation Time

| Proof System | Generation Time | Proof Size | Verification Time |
|--------------|-----------------|------------|-------------------|
| JOLT-Atlas   | ~500ms          | 262 bytes  | ~5ms              |
| Groth16      | ~2s             | 128 bytes  | ~300k gas         |
| PLONK        | ~3s             | 512 bytes  | ~400k gas         |
| STARK        | ~1s             | 100kb      | ~10ms             |

### 6.2 Latency Impact

- **Without zkML**: Checkout session creation ~100ms
- **With zkML**: Checkout session creation ~600ms (+500ms for proof)
- **Async option**: Generate proof in background, update session later

---

## 7. Example Use Cases

### 7.1 High-Value Transactions

**Scenario**: Enterprise procurement agent buying $50k software license

**Value**:
- Merchant requires proof agent has budget approval
- Cryptographic guarantee prevents unauthorized spending
- Audit trail for compliance

### 7.2 Regulated Industries

**Scenario**: Healthcare agent purchasing medical supplies

**Value**:
- Proof meets regulatory requirements (e.g., FDA, HIPAA)
- On-chain audit records for inspections (testnet)
- Liability protection for all parties

### 7.3 Multi-Agent Coordination

**Scenario**: Multiple AI agents coordinating large purchase

**Value**:
- Each agent provides proof of partial authorization
- Combined proofs = full authorization
- Verifiable multi-party computation

---

## 8. Migration Path

### Phase 1: Optional Field (This RFC)
- Add `authorization_proof` as optional field
- No breaking changes
- Early adopters can experiment

### Phase 2: Ecosystem Adoption
- Reference implementations published
- Verification libraries available
- Best practices documented

### Phase 3: Industry Standard (Future)
- Proof verification becomes expected for high-value txns
- Regulatory frameworks incorporate zkML
- Insurance/liability products built on proofs

---

## 9. Open Questions

1. **Should proof_system be extensible?**
   - Current: Enum with known systems
   - Alternative: Free-form string with version

2. **On-chain verification requirement?**
   - Current: Optional
   - Alternative: Required for transactions > threshold

3. **Proof expiration/freshness?**
   - Should proofs have TTL?
   - How to handle stale proofs?

4. **Multi-proof support?**
   - One proof per session, or array of proofs?
   - Use case: Multiple authorization checks

---

## 10. Reference Implementation

NovaNet has implemented a reference implementation at:
https://github.com/hshadab/agentkit/tree/main/acp

**Key Files**:
- `services/proof-service.js` - JOLT-Atlas proof generation
- `services/acp-openai-server.js` - ACP server with zkML extension
- `static/index.html` - Demo UI
- `circuits/` - Groth16 circuits for on-chain verification

**Live Demo**: https://agent-kit.com/acp-demo (if deployed)

---

## 11. Changelog

**2025-09-30**: Initial RFC proposal

---

## 12. References

1. **Agentic Commerce Protocol**: https://github.com/agentic-commerce-protocol/agentic-commerce-protocol
2. **JOLT (a16z crypto)**: https://github.com/a16z/jolt
3. **zkML Overview**: https://0xparc.org/blog/zk-ml
4. **Groth16 (zcash)**: https://github.com/zcash/librustzcash
5. **NovaNet zkML**: https://novanet.xyz

---

**Questions or feedback?** Open an issue or discussion in the ACP repository.
