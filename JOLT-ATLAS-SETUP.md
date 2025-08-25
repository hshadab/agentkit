# JOLT-Atlas Setup Instructions

JOLT-Atlas is required for zkML functionality but is not included in this repository due to its size.

## Installation

1. Clone JOLT-Atlas repository:
```bash
git clone https://github.com/a16z/jolt jolt-atlas
cd jolt-atlas
```

2. Build the zkML core:
```bash
cd zkml-jolt-core
cargo build --release --bin zkml-jolt-core
```

3. Verify installation:
```bash
./target/release/zkml-jolt-core profile --name sentiment
```

## Expected Output

A successful zkML proof generation will show:
- Trace length: 11
- Matrix dimensions: 1024×1024
- Proof generation time: ~10 seconds
- "Bench Complete" message

## Integration

The zkML verifier service expects JOLT-Atlas at:
`/home/hshadab/agentkit/jolt-atlas/zkml-jolt-core/target/release/zkml-jolt-core`

Update the path in `api/zkml-agent-verifier.js` if you install it elsewhere.

## Requirements

- Rust 1.88+ (for building JOLT-Atlas)
- 8GB+ RAM (for proof generation)
- ~2GB disk space

## Troubleshooting

If proof generation times out:
1. Ensure you built with `--release` flag
2. Check available system memory
3. Try the tiny-mlp model instead of sentiment

For more details, see `docs/ZKML-INTEGRATION.md`