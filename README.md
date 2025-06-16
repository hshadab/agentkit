# 🔒 Novanet ZKP Agent Kit

<div align="center">
  <img src="https://via.placeholder.com/200x200/8b5cf6/ffffff?text=ZKP" alt="Novanet ZKP Logo" width="200"/>
  
  <h3>Transform C computations into zero-knowledge proofs in seconds</h3>
  
  [![Version](https://img.shields.io/badge/version-1.0.0-purple.svg)](https://github.com/hshadab/ZKP-agentkit)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Rust](https://img.shields.io/badge/rust-1.75+-orange.svg)](https://www.rust-lang.org/)
  [![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
</div>

## 🌟 Overview

The **Novanet ZKP Agent Kit** is a powerful framework that enables developers to transform C code into zero-knowledge proofs through an intuitive interface. Built on zkEngine's proven zkVM technology, it provides a seamless bridge between traditional computation and cryptographic proof generation.

### What It Actually Does

- **Processes** user-provided C code with hardcoded values
- **Transforms** C code into WebAssembly (WAT) format
- **Generates** cryptographic zero-knowledge proofs of computation
- **Verifies** proofs without revealing input values
- **Understands** natural language commands for pre-defined proof types

### 🎯 Key Features

- ⚡ **13-20 second proof generation** for complex algorithms
- 🔐 **True zero-knowledge** - verify results without exposing inputs
- 🌐 **Real-time WebSocket updates** for proof progress
- 🎨 **Beautiful dark UI** with inline code viewing
- 🛠️ **Support for loops, conditionals, and function calls**
- 📋 **Copy-paste C code interface** with example templates

## 🚀 Quick Start

### Prerequisites

- Rust 1.75+
- Python 3.8+
- OpenAI API key (for natural language processing)

### Installation

```bash
# Clone the repository
git clone https://github.com/hshadab/ZKP-agentkit.git
cd ZKP-agentkit

# Set up Python environment
python -m venv langchain_env
source langchain_env/bin/activate  # On Windows: langchain_env\Scripts\activate
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your OpenAI API key

# Build Rust backend
cargo build --release
```

### Running the System

```bash
# Terminal 1: Start Python service
source langchain_env/bin/activate
python langchain_service.py

# Terminal 2: Start Rust backend
cargo run

# Access the web interface
open http://localhost:8001
```

## 💻 Usage

### Method 1: Natural Language Commands

Type commands in the chat interface:
- `"prove kyc"` - Generate KYC compliance proof
- `"verify proof <id>"` - Verify a generated proof
- `"prove location"` - Generate location verification proof

### Method 2: Paste C Code

1. Click the 📋 **Paste** button
2. Write or paste C code with hardcoded values:

```c
int is_prime(int n) {
    if (n <= 1) return 0;
    if (n == 2) return 1;
    if (n % 2 == 0) return 0;
    
    for (int i = 3; i * i <= n; i += 2) {
        if (n % i == 0) return 0;
    }
    return 1;
}

int main() {
    int number_to_check = 17;  // ← Hardcode your value here
    return is_prime(number_to_check);
}
```

3. Click **Transform & Compile**
4. The system generates a proof that the computation was performed correctly

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Web UI        │────▶│  Rust Backend    │────▶│   zkEngine      │
│  (Port 8001)    │◀────│  WebSocket       │◀────│   Prover        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Python Service   │
                        │ (Port 8002)      │
                        │ - NLP Processing │
                        │ - C→WAT Transform│
                        └──────────────────┘
```

## 📊 Supported Operations

### ✅ What Works
- Basic arithmetic (`+`, `-`, `*`, `/`, `%`)
- Loops (`for`, `while`, `do-while`)
- Conditionals (`if`, `else`, `switch`)
- Function calls (non-recursive)
- Local variables
- Early returns
- Complex algorithms (prime checking, fibonacci, GCD, etc.)

### ❌ Limitations
- Only `int32` data type supported
- No floating point operations
- No arrays or dynamic memory
- Single return value only
- No external function imports
- Hardcoded values required (no runtime input)

## 🗺️ Roadmap

### Phase 1: Core Enhancements (Q2 2024)
- [ ] **Natural Language to C Generation** - Describe algorithms in plain English and automatically generate C code
- [ ] **Dynamic Input Support** - Accept runtime arguments instead of requiring hardcoded values
- [ ] **Array and Memory Operations** - Support for more complex data structures
- [ ] **Floating Point Operations** - Enable mathematical computations with decimals

### Phase 2: Agent Kit Ecosystem (Q3 2024)
- [ ] **Google Agent Kit Integration** - Connect with Google's AI agents for enhanced capabilities
- [ ] **Solana Agent Kit Compatibility** - Enable on-chain proof verification on Solana
- [ ] **Base Agent Kit Integration** - Leverage Base's developer tools and smart contract ecosystem
- [ ] **Model Context Protocol** - Standardized communication between AI models and proof generation

### Phase 3: Advanced Features (Q4 2024)
- [ ] **zkML Integration** - Zero-knowledge machine learning model inference
- [ ] **Circle USDC Integration** - Verifiable and compliant USDC transactions via natural language
  - "Send $100 USDC to alice.eth with KYC proof"
  - "Verify sender compliance before accepting payment"
- [ ] **Goose Integration** - Connect with Block's Goose framework for enhanced agent capabilities
- [ ] **Multi-Language Support** - Expand beyond C to Rust, Python, and JavaScript

### Phase 4: Enterprise & Scale (2025)
- [ ] **Distributed Proof Generation** - Parallel processing for faster proofs
- [ ] **Proof Aggregation** - Combine multiple proofs into one
- [ ] **Custom Proof Circuits** - Domain-specific optimizations
- [ ] **Compliance Templates** - Pre-built proofs for regulatory requirements
- [ ] **SDK Release** - Libraries for major programming languages

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Areas We Need Help
- Optimizing proof generation time
- Adding support for more C features
- Improving the UI/UX
- Writing documentation and tutorials
- Creating example proof templates

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [zkEngine](https://github.com/zkEngine/zkEngine) - The powerful zkVM that makes this possible
- [LangChain](https://langchain.com/) - Natural language processing
- [Novanet](https://novanet.xyz) - Supporting open-source ZK development

## 📞 Contact

- **GitHub Issues**: [Report bugs or request features](https://github.com/hshadab/ZKP-agentkit/issues)
- **Website**: [novanet.xyz](https://novanet.xyz)
- **Twitter**: [@novanet_xyz](https://twitter.com/novanet_xyz)

---

<div align="center">
  Built with ❤️ by the Novanet Team
</div>
