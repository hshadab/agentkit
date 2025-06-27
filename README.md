#   <img src="https://cdn.prod.website-files.com/65d52b07d5bc41614daa723f/665df12739c532f45b665fe7_logo-novanet.svg" alt="Novanet ZKP Logo" width="200"/>

<div align="center">

 <h1>Verifiable Agent Kit</h1>  
 <h3>The First Natural Language AI Interface for Zero-Knowledge Proofs</h3>
  
  [![Version](https://img.shields.io/badge/version-1.0.0-purple.svg)](https://github.com/hshadab/ZKP-agentkit)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Rust](https://img.shields.io/badge/rust-1.75+-orange.svg)](https://www.rust-lang.org/)
  [![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
</div>

## The Breakthrough

For the first time ever, **anyone can generate zero-knowledge proofs using natural language**. No cryptography PhD required. No complex mathematics. Just describe what you want to prove, and our AI agent handles the rest.

```
You: "Prove my age is over 18"
Agent: ✅ Generating KYC compliance proof...

You: "Verify this AI-generated content"
Agent: ✅ Creating authenticity proof...

You: "Prove my location without revealing it"
Agent: ✅ Generating privacy-preserving location proof...
```

This makes advanced cryptography accessible to everyone through the power of natural language AI.

## 🌟 Why This Matters

Zero-knowledge proofs are the future of privacy-preserving verifiable computation, but they've been locked away behind complex mathematics and specialized languages. The Novanet Verifiable Agent Kit breaks down these barriers by:

1. **Speaking Human** - Interact with ZK proofs using plain English
2. **Thinking Like a Developer** - Understands intent and context
3. **Acting Like an Expert** - Handles the cryptographic complexity for you

### 💪 Powered by NovaNet's zkVM

Our breakthrough is built on **NovaNet's cutting-edge zkVM technology**, which brings unprecedented capabilities:

- **Memory-Efficient Proving** - Generate complex proofs with minimal resource requirements, enabling:
  - Mobile device proof generation
  - Edge computing applications
  - Scalable multi-proof workflows
  - Resource-constrained environments

- **Private Agentic Workflows** - Keep your AI agent's verifiable decision-making completely private:
  - Prove an agent took correct actions without revealing its strategy
  - Verify multi-step reasoning without exposing intermediate thoughts
  - Maintain competitive advantage while ensuring compliance
  - Enable trustless AI agent interactions

- **Lightning-Fast Execution** - NovaNet's optimized zkVM achieves:
  - Speedy proof generation for complex algorithms
  - Sub-second verification
  - Parallel proof processing capabilities
  - Efficient proof aggregation for multiple operations

### 🎯 Current Capabilities

Our v1.0 agent can:
- **Understand** natural language requests for proof generation
- **Transform** user-provided C code into zero-knowledge proofs
- **Generate** cryptographic proofs in 13-20 seconds
- **Verify** proofs without revealing sensitive data
- **Guide** users through the entire proof lifecycle

### 🛠️ How It Works

1. **Natural Language Understanding** - Powered by LangChain and GPT-4, the agent interprets your intent
2. **Code Transformation** - Converts C programs into WebAssembly format
3. **Proof Generation** - Uses NovaNet's memory-efficient zkVM to create cryptographic proofs
4. **Real-time Feedback** - WebSocket updates keep you informed throughout

## 💡 Example Use Cases

### Current (v1.0)
```bash
# Natural language commands
"Prove my KYC compliance"
"Verify proof abc-123"
"Show me all my proofs"

# Code-based proofs
"Transform this prime checker into a ZK proof"
[Paste C code with hardcoded values]
```

### Coming Soon
```bash
# Natural language to code (Roadmap)
"Create a proof that 17 is prime"
"Prove I know the solution to this sudoku without revealing it"
"Verify my credit score is above 700 without showing the exact number"
```

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/hshadab/ZKP-agentkit.git
cd ZKP-agentkit

# Install dependencies
python -m venv langchain_env
source langchain_env/bin/activate
pip install -r requirements.txt

# Configure AI
cp .env.example .env
# Add your OpenAI API key to .env

# Start the agent
cargo build --release
python langchain_service.py & cargo run

# Talk to your ZK agent
open http://localhost:8001
```

## 🏗️ Architecture

The breakthrough is in the AI layer that sits between humans and cryptography:

```
Human Language ──→ AI Agent ──→ ZK Proofs
     │                │              │
     │                │              │
"Prove I'm 18+"   Understands    Generates
                  Transforms     Cryptographic
                  Executes         Proof
```

### 🔐 The NovaNet Advantage

NovaNet's zkVM provides unique benefits for agentic applications:

- **Stateful Proving** - Maintain context across multiple proofs
- **Compositional Proofs** - Combine simple proofs into complex workflows
- **Memory Isolation** - Each proof runs in complete isolation
- **Deterministic Execution** - Guaranteed reproducible results

## 🗺️ Roadmap: The Future of Natural Language ZK

### Phase 1: Enhanced Natural Language 
- [ ] **Natural Language to C Generation** 
  - "Prove that 17 is prime" → Generates complete C code → Creates ZK proof
  - "Verify my age is between 18-65" → Writes verification logic → Proof
- [ ] **LangChain Advanced Integration**
  - Memory systems for context-aware proofs
  - Custom chains for domain-specific proving strategies
  - RAG integration for proof template retrieval
- [ ] **LangGraph Integration**
  - Multi-step proof workflows with decision trees
  - Conditional proof generation based on context
  - Stateful conversations about proof requirements
- [ ] **Memory-Optimized Proving**
  - Parallel proof generation for large computations
  - Incremental proving for complex workflows
  - Proof compression for efficient storage

### Phase 2: Model Context Protocol Integration 
- [ ] **MCP Foundation** - Revolutionizing how AI models interact with ZK systems:
  - **Standardized ZK Tools**: Any AI model can generate/verify proofs through unified protocol
  - **Cross-Model Compatibility**: Claude, GPT, Llama all speak the same ZK language
  - **Context Preservation**: Maintain proof context across model switches
  - **Resource Sharing**: Models share proof templates and verification strategies
  
- [ ] **MCP Benefits for ZK**:
  - **Proof Portability**: Generate with one model, verify with another
  - **Collaborative Proving**: Multiple AI agents work together on complex proofs
  - **Universal ZK Interface**: Any MCP-compatible AI becomes ZK-capable
  - **Automated Optimization**: Models learn and share optimal proving strategies

- [ ] **Private Agent Workflows**:
  - Prove agent reasoning without revealing prompts
  - Verify decision trees while keeping logic private
  - Enable competitive AI strategies with public verification

### Phase 3: Agent Ecosystem Integration
- [ ] **Multi-Agent and Multi-Chain Orchestration**
  - Google Agent Kit: Leverage search and knowledge for proof generation
  - Solana Agent Kit: Solana on-chain proof verification and smart contract integration
  - Base Agent Kit: EVM blockchain proof verification and smart contract integration
  
- [ ] **zkML Integration**
  - "Prove this image is AI-generated without showing the image"
  - "Verify model inference without revealing the model"
  - Memory-efficient ML model proving on edge devices
  
- [ ] **Block's Goose AI Framework Integration**
  - Advanced agent reasoning for complex multi-party proofs
  - Automated proof strategy optimization
  - Private multi-agent negotiations with public outcomes

### Phase 4: Financial & Compliance AI 
- [ ] **Circle USDC Integration**
  - "Send $100 USDC with automatic KYC proof"
  - "Create recurring payments with privacy-preserving compliance"
  - Natural language smart contract conditions
  
- [ ] **Regulatory Compliance Suite**
  - "Generate GDPR-compliant data processing proof"
  - "Prove Basel III compliance without revealing positions"
  - "Create MiCA-compliant token transfer proofs"

### Phase 5: The Autonomous ZK Agent  
- [ ] **Self-Improving Proofs** - Agent learns optimal proof strategies
- [ ] **Cross-Language Support** - Python, Rust, JavaScript, Solidity
- [ ] **Proof Recommendation Engine** - "You might also want to prove..."
- [ ] **Natural Language Circuits** - Describe custom ZK circuits in English
- [ ] **Distributed Agent Networks** - Private coordination with public verification

## 📊 Technical Specifications

### Current Limitations (v1.0)
- Requires C code with hardcoded values
- Supports only int32 operations
- Single return values only

### Supported Operations
- ✅ Arithmetic, loops, conditionals
- ✅ Function calls, local variables
- ✅ Complex algorithms (prime checking, fibonacci, etc.)

### NovaNet zkVM Specifications
- **Memory Model**: Isolated 32-bit address space
- **Instruction Set**: WASM subset optimized for proving
- **Proof Size**: ~18MB (constant regardless of computation)
- **Verification Time**: <3 seconds
- **Memory Efficiency**: 10x lower than comparable zkVMs

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [zkEngine](https://github.com/zkEngine/zkEngine) - The zkVM powering the zero knowledge proofs
- [LangChain](https://langchain.com/) - Natural language processing framework
- [OpenAI](https://openai.com/) - LLM powering the natural language interactions

---

<div align="center">
  <h3>🔮 Making Zero-Knowledge Proofs as Easy as Having a Conversation</h3>
  <p>Built with ❤️ by the Novanet Team</p>
</div>
