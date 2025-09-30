# zk-binding Extension (experimental)

This repository layers an optional “zk-binding:v1” extension on top of the x402 flow to bind the AI → proof → intent → server policy → payment path.

Scope:
- Adds three hashes to the attestation token returned by `/attest`:
  - `proofHash`: commitment to the zkML proof bytes (proof-of-decision)
  - `intentHash`: SHA-256 of `UPPERCASE_METHOD + '\n' + path + '\n' + sha256(body)`
  - `acceptsHash`: SHA-256 of `{ resource, network, asset, payTo, price }` derived from server config

Goals:
- Prevent TOCTOU between preflight and payment (server-side Accepts cannot be silently changed).
- Bind the exact HTTP operation (method/path/body) to the attested decision.
- Allow transparent auditing from attestation to on-chain anchor (optional).

Negotiation / opt-in:
- The base x402 protocol proceeds without these fields.
- Servers MAY include and enforce these fields when present.
- Clients that understand the extension can surface the hashes for audit.

Versioning:
- Identified informally as `zk-binding:v1` in docs.
- Future versions should document hash domains and canonical encodings explicitly.

Security notes:
- Attestations are signed via HMAC (default) or EIP-712 (opt-in) and include TTL. Do not log raw proofs.
- Use a nonce/TTL on quotes (`quoteId`, `expiresAt`) and a replay window for any HMAC headers.

