# Complete Directory Structure

## Root Level
```
agentkit/
├── .env                    # Environment variables
├── .gitignore             
├── Cargo.toml             # Rust project config
├── Cargo.lock
├── package.json           # Node.js project config
├── package-lock.json
├── requirements.txt       # Python dependencies
├── hardhat.config.js      # Ethereum development
├── config.js              # JavaScript config
├── config.py              # Python config
├── README.md              # Main documentation
└── Various test files and scripts
```

## Main Directories

### `/parsers/` - All parsing logic
```
parsers/
├── nova/                  # Nova proof parsers
│   ├── nova-proof-formatter.js
│   ├── nova-proof-parser.js
│   ├── nova-proof-parser-v2.js
│   └── zkengine-nova-parser.js
├── workflow/              # Workflow parsers
│   ├── workflowParser.js
│   ├── workflowExecutor.js
│   ├── openaiWorkflowParserEnhanced.py
│   └── workflowParser_final.js
└── README.md
```

### `/services/` - Backend services
```
services/
└── chat_service.py        # AI chat service for workflow parsing
```

### `/src/` - Core source code
```
src/
├── main.rs                # Rust WebSocket server
├── real_snark_prover.js   # SNARK proof generation
├── snark_generation_service.js
├── snark_precompute_service.js
├── cached_snark_generator.js
├── test_real_snark.js
└── Various Rust modules for Nova/Groth16 conversion
```

### `/static/` - Frontend files
```
static/
├── index.html             # Main UI
├── css/
│   └── main.css
└── js/
    ├── blockchain/        # Blockchain verifiers
    │   ├── blockchain-verifier.js
    │   ├── iotex-device-verifier.js
    │   └── simple-nova-verifier.js
    ├── ui/               # UI components
    │   ├── workflow-manager.js
    │   ├── ui-manager.js
    │   ├── proof-manager.js
    │   ├── transfer-manager.js
    │   └── device-workflow-handler.js
    ├── core/             # Core utilities
    │   ├── config.js
    │   ├── utils.js
    │   └── debug-helper.js
    └── main.js           # Entry point
```

### `/contracts/` - Smart contracts
```
contracts/
├── IoTeXDeviceVerifierV2.sol
├── IoTeXNovaDecider.sol
├── AvalancheGroth16Verifier.sol
├── SimplifiedZKVerifier.sol
└── Various other verifier contracts
```

### `/circuits/` - Circom circuits
```
circuits/
├── RealProofOfProof.circom
├── ProofOfProof.circom
├── TestSimple.circom
└── Various .zkey and .ptau files
```

### `/circle/` - Circle API integration
```
circle/
├── archive/              # Archived workflow outputs
│   └── workflows-2025-01/
├── proofs/              # Circle-related proofs
├── Various Circle API test scripts
├── wallet-info.json
└── Circle handler files
```

### `/proofs/` - Generated proofs storage
```
proofs/
├── proof_*/             # Timestamped proof directories
│   ├── metadata.json
│   ├── proof.bin
│   └── public.json
└── Many proof directories...
```

### `/tests/` - All test files
```
tests/
├── integration/         # Integration tests
│   ├── iot/            # IoT-specific tests
│   └── Various test files
├── ui/                 # UI test HTML files
└── unit/               # Unit tests
```

### `/docs/` - Documentation
```
docs/
├── deployment/         # Deployment guides
├── tests/             # Test documentation
├── archive/           # Archived docs
└── Various .md files
```

### `/build/` - Build artifacts
```
build/
├── RealProofOfProof_js/
├── compiled/
└── Various .zkey and verification files
```

### `/examples/` - Example code
```
examples/
├── demo-multi-step.js
├── demo_device_proximity.js
└── Various HTML test files
```

### `/zkengine_binary/` - WASM binaries
```
zkengine_binary/
├── device_proximity.wasm
├── kyc_compliance_real.wasm
├── ai_prediction_commitment.wasm
└── zkEngine executable
```

### `/wasm_files/` - Additional WASM files
```
wasm_files/
└── Various .wasm files for different operations
```

## Key Files by Function

### Entry Points
- `src/main.rs` - Rust WebSocket server
- `services/chat_service.py` - Python AI service
- `static/js/main.js` - Frontend entry
- `static/index.html` - UI

### Configuration
- `.env` - Environment variables
- `config.js` - JavaScript config
- `config.py` - Python config

### Parsers
- `parsers/workflow/openaiWorkflowParserEnhanced.py` - Main AI parser
- `parsers/nova/*` - Nova proof parsers

### Smart Contracts
- `contracts/IoTeXDeviceVerifierV2.sol` - IoTeX device verifier
- `contracts/SimplifiedZKVerifier.sol` - Base/Ethereum verifier

## Service Architecture

1. **Frontend** (`static/`) → User interface
2. **WebSocket Server** (`src/main.rs`) → Handles proof generation
3. **Chat Service** (`services/chat_service.py`) → Parses natural language
4. **Parsers** (`parsers/`) → Process workflows and proofs
5. **Smart Contracts** (`contracts/`) → On-chain verification

## Data Flow

1. User input → `static/index.html`
2. WebSocket → `src/main.rs` (proof generation)
3. HTTP API → `services/chat_service.py` (workflow parsing)
4. Blockchain → Various verifier contracts
5. Results → Back to UI