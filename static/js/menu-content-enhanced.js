/**
 * Enhanced Menu Content for AgentKit
 * Provides detailed information, links, and code samples for menu items
 */

const MenuContent = {
    // Testnet Configuration
    testnet: {
        title: "🧪 Test on Testnet",
        subtitle: "Multi-chain testnet environment",
        description: "Deploy and test your verifiable AI agents across multiple testnets",
        content: {
            networks: [
                {
                    name: "Ethereum Sepolia",
                    chainId: 11155111,
                    rpc: "https://eth-sepolia.public.blastapi.io",
                    explorer: "https://sepolia.etherscan.io",
                    faucet: "https://sepoliafaucet.com",
                    contracts: {
                        zkMLVerifier: "0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944",
                        gatewayWallet: "0xE616B2eC620621797030E0AB1BA38DA68D78351C"
                    }
                },
                {
                    name: "Base Sepolia",
                    chainId: 84532,
                    rpc: "https://sepolia.base.org",
                    explorer: "https://sepolia.basescan.org",
                    faucet: "https://portal.cdp.coinbase.com/products/faucet",
                    contracts: {
                        usdcToken: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
                    }
                },
                {
                    name: "Avalanche Fuji",
                    chainId: 43113,
                    rpc: "https://api.avax-test.network/ext/bc/C/rpc",
                    explorer: "https://testnet.snowtrace.io",
                    faucet: "https://faucet.avax.network",
                    contracts: {
                        usdcToken: "0x5425890298aed601595a70AB815c96711a31Bc65"
                    }
                }
            ],
            quickStart: `
// Connect to testnet
const provider = new ethers.JsonRpcProvider("https://eth-sepolia.public.blastapi.io");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Deploy verifier contract
const verifier = await ethers.deployContract("ZKMLVerifier", wallet);
await verifier.waitForDeployment();
console.log("Verifier deployed to:", await verifier.getAddress());

// Generate and verify proof
const proof = await zkEngine.generateProof(data);
const tx = await verifier.verifyProof(proof);
await tx.wait();
console.log("Proof verified on-chain!");`,
            resources: [
                { name: "Get Testnet ETH", url: "https://sepoliafaucet.com" },
                { name: "Get Test USDC", url: "https://faucet.circle.com" },
                { name: "Contract Explorer", url: "https://sepolia.etherscan.io/address/0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944" }
            ]
        }
    },

    // Developer Tools
    developerTools: {
        title: "🛠️ Developer Tools",
        subtitle: "Essential tools for building verifiable AI agents",
        description: "SDKs, CLI tools, and debugging utilities for rapid development",
        content: {
            tools: [
                {
                    name: "AgentKit CLI",
                    command: "npm install -g @agentkit/cli",
                    description: "Command-line interface for managing agents",
                    usage: `
# Initialize new project
agentkit init my-agent

# Generate zkML proof
agentkit prove --type zkml --input data.json

# Deploy to testnet
agentkit deploy --network sepolia

# Verify on-chain
agentkit verify --tx 0x5bd91b01...`
                },
                {
                    name: "zkEngine SDK",
                    install: "npm install @agentkit/zkengine",
                    description: "JavaScript/TypeScript SDK for proof generation",
                    example: `
import { zkEngine } from '@agentkit/zkengine';

// Initialize engine
const engine = new zkEngine({
    framework: 'JOLT-Atlas',
    chain: 'ethereum'
});

// Generate proof
const proof = await engine.generateProof({
    type: 'llm-decision',
    input: {
        model: 'gemini-1.5-pro',
        decision: 'APPROVE',
        confidence: 0.95
    }
});

// Verify locally
const isValid = await engine.verifyLocal(proof);
console.log('Proof valid:', isValid);`
                },
                {
                    name: "Proof Explorer",
                    url: "/explorer",
                    description: "Visual debugger for proof generation",
                    features: [
                        "Step-by-step proof visualization",
                        "Gas cost estimation",
                        "Circuit constraint debugger",
                        "Performance profiler"
                    ]
                }
            ],
            debugging: `
// Enable debug mode
export DEBUG=agentkit:*

// Verbose logging
zkEngine.setLogLevel('debug');

// Trace proof generation
const proof = await engine.generateProof(data, {
    trace: true,
    benchmark: true
});

console.log('Generation time:', proof.benchmarks);
console.log('Circuit constraints:', proof.constraints);`,
            apis: [
                {
                    endpoint: "POST /api/prove",
                    description: "Generate zkML proof",
                    example: `
curl -X POST http://localhost:8001/zkml/prove \\
  -H "Content-Type: application/json" \\
  -d '{
    "input": {
        "prompt": "Analyze transaction",
        "decision": 1,
        "confidence": 95
    }
  }'`
                },
                {
                    endpoint: "GET /zkml/proof/:sessionId",
                    description: "Fetch zkML proof JSON (local)",
                    example: `
curl http://localhost:8001/zkml/proof/abc123`
                }
            ]
        }
    },

    // zkEngine Binary
    zkEngineBinary: {
        title: "⚙️ zkEngine Binary",
        subtitle: "High-performance Rust proof generation",
        description: "Native binary for maximum performance and security",
        content: {
            installation: `
# Download pre-built binary
wget https://github.com/agentkit/releases/zkEngine-v2.0-linux
chmod +x zkEngine-v2.0-linux

# Or build from source
git clone https://github.com/agentkit/zkengine
cd zkengine
cargo build --release
./target/release/zkEngine --version`,
            usage: `
# Generate KYC proof
./zkEngine prove kyc \\
  --input user_data.json \\
  --output proof.bin \\
  --circuit kyc_v2.r1cs

# Verify proof locally
./zkEngine verify \\
  --proof proof.bin \\
  --public public_inputs.json

# Benchmark performance
./zkEngine benchmark \\
  --type all \\
  --iterations 100`,
            configuration: `
# zkengine.toml
[general]
framework = "groth16"
curve = "bn254"
backend = "arkworks"

[optimization]
parallel_cores = 8
memory_limit = "4GB"
cache_enabled = true

[circuits]
path = "./circuits"
compiled_path = "./build"

[logging]
level = "info"
file = "zkengine.log"`,
            performance: {
                benchmarks: [
                    { operation: "KYC Proof", time: "1.2s", constraints: "50,000" },
                    { operation: "Location Proof", time: "0.8s", constraints: "30,000" },
                    { operation: "zkML Decision", time: "0.5s", constraints: "100,000" },
                    { operation: "IoT Attestation", time: "0.3s", constraints: "20,000" }
                ],
                optimization: `
// Use parallel proving
export RAYON_NUM_THREADS=8

// Enable GPU acceleration (if available)
export CUDA_VISIBLE_DEVICES=0
./zkEngine prove --gpu

// Memory optimization
export ZKENGINE_CACHE_SIZE=2048
./zkEngine prove --low-memory`
            }
        }
    },

    // Circuits Library
    circuits: {
        title: "📐 Circuits Library",
        subtitle: "Pre-built circuits for common use cases",
        description: "Optimized Circom circuits for demos/testnets",
        content: {
            available: [
                {
                    name: "KYC Compliance",
                    file: "circuits/kyc_compliance.circom",
                    constraints: 50000,
                    description: "Prove identity compliance without revealing PII",
                    template: `
template KYCCompliance() {
    signal input age;
    signal input country_code;
    signal input risk_score;
    signal output compliant;
    
    // Age must be >= 18
    component ageCheck = GreaterEqThan(8);
    ageCheck.in[0] <== age;
    ageCheck.in[1] <== 18;
    
    // Risk score must be < 50
    component riskCheck = LessThan(8);
    riskCheck.in[0] <== risk_score;
    riskCheck.in[1] <== 50;
    
    compliant <== ageCheck.out * riskCheck.out;
}`
                },
                {
                    name: "Location Proof",
                    file: "circuits/location_proof.circom",
                    constraints: 30000,
                    description: "Prove location within boundary without revealing coordinates",
                    template: `
template LocationProof() {
    signal input latitude;
    signal input longitude;
    signal input boundary[4]; // [minLat, maxLat, minLon, maxLon]
    signal output within_boundary;
    
    // Check if within boundary
    component latCheck = InRange(32);
    latCheck.value <== latitude;
    latCheck.min <== boundary[0];
    latCheck.max <== boundary[1];
    
    component lonCheck = InRange(32);
    lonCheck.value <== longitude;
    lonCheck.min <== boundary[2];
    lonCheck.max <== boundary[3];
    
    within_boundary <== latCheck.out * lonCheck.out;
}`
                }
            ],
            compilation: `
# Compile circuit
circom circuits/kyc_compliance.circom \\
  --r1cs --wasm --sym \\
  -o build/

# Generate witness
node build/kyc_compliance_js/generate_witness.js \\
  build/kyc_compliance_js/kyc_compliance.wasm \\
  input.json witness.wtns

# Generate proof
snarkjs groth16 prove \\
  build/kyc_compliance_0001.zkey \\
  witness.wtns proof.json public.json

# Verify proof
snarkjs groth16 verify \\
  verification_key.json \\
  public.json proof.json`,
            optimization: [
                "Use bit decomposition for range checks",
                "Minimize multiplication gates",
                "Batch similar constraints",
                "Pre-compute constant expressions"
            ]
        }
    },

    // API Documentation
    apiDocs: {
        title: "📚 API Documentation",
        subtitle: "Complete API reference",
        description: "RESTful APIs and WebSocket endpoints",
        content: {
            baseUrl: "http://localhost:8002",
            authentication: `
// API Key authentication
headers: {
    'X-API-Key': 'your-api-key-here'
}

// JWT authentication
headers: {
    'Authorization': 'Bearer eyJhbGc...'
}`,
            endpoints: [
                {
                    method: "POST",
                    path: "/zkml/prove",
                    description: "Generate zkML proof for AI decision",
                    request: {
                        body: {
                            input: {
                                prompt: "string",
                                decision: "number (0 or 1)",
                                confidence: "number (0-100)",
                                model: "string"
                            }
                        }
                    },
                    response: {
                        sessionId: "string",
                        status: "generating | completed | failed",
                        estimatedTime: "string"
                    }
                },
                {
                    method: "GET",
                    path: "/zkml/status/:sessionId",
                    description: "Check proof generation status",
                    response: {
                        status: "string",
                        proof: {
                            framework: "string",
                            proof_bytes: "array",
                            public_signals: "array"
                        },
                        proofTime: "number (ms)"
                    }
                },
                {
                    method: "POST",
                    path: "/groth16/verify",
                    description: "Verify proof on-chain",
                    request: {
                        body: {
                            proof: "object",
                            publicInputs: "array",
                            chain: "string"
                        }
                    },
                    response: {
                        verified: "boolean",
                        txHash: "string",
                        gasUsed: "number"
                    }
                }
            ],
            websocket: `
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8001');

// Subscribe to proof updates
ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'proof_updates'
}));

// Receive updates
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'proof_update') {
        console.log('Proof status:', data.status);
    }
};`,
            rateLimits: {
                default: "100 requests/minute",
                proof_generation: "10 requests/minute",
                on_chain_verification: "5 requests/minute"
            }
        }
    },

    // Integration Examples
    integrations: {
        title: "🔗 Integration Examples",
        subtitle: "Connect with popular platforms",
        description: "Ready-to-use integrations with major cloud providers",
        content: {
            google: {
                name: "Google Vertex AI",
                code: `
import { VerifiableADKAgent } from '@agentkit/google-a2a';

// Create verifiable Gemini agent
const agent = new VerifiableADKAgent({
    model: 'gemini-1.5-pro',
    verification: true
});

// Process with proof
const result = await agent.processWithVerification(
    "Analyze this loan application",
    { requireProof: true }
);

console.log('Decision:', result.decision);
console.log('Proof:', result.verification.zkProof);`
            },
            openai: {
                name: "OpenAI GPT-4",
                code: `
import { verifyGPTDecision } from '@agentkit/openai';

// Make GPT-4 decision
const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }]
});

// Generate proof of decision
const proof = await verifyGPTDecision({
    model: "gpt-4",
    prompt: prompt,
    response: response.choices[0].message,
    temperature: 0
});`
            },
            circle: {
                name: "Circle Gateway",
                code: `
import { GatewayWithProof } from '@agentkit/circle';

// Initialize with proof requirement
const gateway = new GatewayWithProof({
    apiKey: CIRCLE_API_KEY,
    requireProof: true
});

// Transfer with zkML authorization
const transfer = await gateway.transfer({
    amount: "50.00",
    currency: "USD",
    destination: recipientAddress,
    proof: zkmlProof
});`
            }
        }
    }
};

// Function to display content in UI
function displayMenuContent(section) {
    const content = MenuContent[section];
    if (!content) return null;
    
    return `
        <div class="menu-content-panel">
            <div class="menu-header">
                <h2>${content.title}</h2>
                <p class="subtitle">${content.subtitle}</p>
            </div>
            <div class="menu-description">
                ${content.description}
            </div>
            <div class="menu-body">
                ${renderContent(content.content)}
            </div>
        </div>
    `;
}

// Helper function to render content based on structure
function renderContent(content) {
    let html = '';
    
    for (const [key, value] of Object.entries(content)) {
        if (typeof value === 'string') {
            html += `
                <div class="content-section">
                    <h3>${key.charAt(0).toUpperCase() + key.slice(1)}</h3>
                    <pre class="code-block">${value}</pre>
                </div>
            `;
        } else if (Array.isArray(value)) {
            html += `
                <div class="content-section">
                    <h3>${key.charAt(0).toUpperCase() + key.slice(1)}</h3>
                    ${renderArray(value)}
                </div>
            `;
        } else if (typeof value === 'object') {
            html += `
                <div class="content-section">
                    <h3>${key.charAt(0).toUpperCase() + key.slice(1)}</h3>
                    ${renderObject(value)}
                </div>
            `;
        }
    }
    
    return html;
}

function renderArray(arr) {
    return `<ul class="content-list">
        ${arr.map(item => {
            if (typeof item === 'object') {
                return `<li>${renderObject(item)}</li>`;
            }
            return `<li>${item}</li>`;
        }).join('')}
    </ul>`;
}

function renderObject(obj) {
    let html = '<div class="content-object">';
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' || typeof value === 'number') {
            html += `<div class="object-field"><strong>${key}:</strong> ${value}</div>`;
        } else if (Array.isArray(value)) {
            html += `<div class="object-field"><strong>${key}:</strong>${renderArray(value)}</div>`;
        } else if (typeof value === 'object') {
            html += `<div class="object-field"><strong>${key}:</strong>${renderObject(value)}</div>`;
        }
    }
    html += '</div>';
    return html;
}

// Export for use in other modules
window.MenuContent = MenuContent;
window.displayMenuContent = displayMenuContent;
