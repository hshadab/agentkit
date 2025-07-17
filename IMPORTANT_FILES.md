# Important Files - DO NOT DELETE

> **Note**: Repository has been reorganized. See `/docs/REPOSITORY_ORGANIZATION.md` for full structure.

## Core Application Files
- `src/main.rs` - Rust WebSocket server
- `chat_service.py` - Python AI service with OpenAI
- `static/index.html` - Main UI
- `config.js` / `config.py` - Configuration files

## Blockchain Integration
- `static/ethereum-verifier.js` - Ethereum verification
- `static/solana-verifier.js` - Solana verification
- `contracts/ProofVerifier.sol` - Ethereum smart contract
- `contracts/proof_verifier.rs` - Solana program

## Circle Integration
- `circle/circleHandler.js` - USDC transfer logic

## Workflow System
- `parsers/workflow/workflowExecutor.js` - Workflow execution
- `parsers/workflow/workflowParser.js` - Workflow parsing

## zkEngine Files
- `zkengine_binary/zkEngine` - Main binary
- `zkengine_binary/*.wat` - WASM proof files

## Configuration
- `.env` - Environment variables (NOT in git)
- `.env.example` - Example environment file
- `package.json` - Node dependencies
- `requirements.txt` - Python dependencies
- `Cargo.toml` - Rust dependencies

## Documentation
- `README.md` - Main documentation
- This file - Important files list

## Build Artifacts (Can be regenerated)
- `target/` - Rust build
- `node_modules/` - Node dependencies
- `__pycache__/` - Python cache
- `proofs/` - Generated proofs
- `build/` - Build artifacts