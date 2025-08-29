# Arecibo Nova Integration Plan
## From Simulated to Real Recursive zkML

### 🎯 Executive Summary

This document outlines the complete plan to integrate Arecibo's real Nova implementation into our Nova+JOLT gateway system, replacing the current simulated folding with cryptographically valid recursive proofs.

**Current State**: Simulated Nova folding (functional prototype)  
**Target State**: Real Nova IVC using Arecibo library  
**Timeline**: 4-5 weeks  
**Risk Level**: Medium (requires Rust expertise)

---

## 📊 Current vs Target Architecture

### Current (Simulated)
```javascript
// Pseudo-folding with simple hashing
NovaAccumulator.fold() → SHA256 hash → Mock proof
```

### Target (Real Arecibo)
```rust
// Actual recursive SNARK folding
RecursiveSNARK::prove_step() → Compressed proof → On-chain verification
```

---

## 🗓️ Implementation Phases

### Phase 1: Rust Integration (Week 1-2)

#### 1.1 Set Up Arecibo Dependencies
```toml
# Cargo.toml
[dependencies]
arecibo = { git = "https://github.com/wyattbenno777/arecibo", branch = "wyatt_dev" }
nova-snark = "0.23.0"
bellperson = "0.25.0"
ff = "0.13"
pasta_curves = "0.5"
serde = { version = "1.0", features = ["derive"] }
bincode = "1.3"
```

#### 1.2 Create Nova Circuit for JOLT Parameters
```rust
// src/circuits/jolt_circuit.rs
use arecibo::traits::circuit::StepCircuit;
use bellperson::{Circuit, ConstraintSystem, SynthesisError};

#[derive(Clone, Debug)]
pub struct JOLTDecisionCircuit {
    // 14 JOLT-Atlas parameters
    pub amount: Option<F>,
    pub recipient_risk: Option<F>,
    pub sender_history: Option<F>,
    pub time_risk: Option<F>,
    pub jurisdiction_risk: Option<F>,
    pub sanctions_check: Option<F>,
    pub velocity_score: Option<F>,
    pub pattern_deviation: Option<F>,
    pub counterparty_score: Option<F>,
    pub network_risk: Option<F>,
    pub volatility_index: Option<F>,
    pub liquidity_score: Option<F>,
    pub kyc_completeness: Option<F>,
    pub previous_risk: Option<F>,
}

impl<F: PrimeField> StepCircuit<F> for JOLTDecisionCircuit {
    fn arity(&self) -> usize { 14 }
    
    fn synthesize<CS: ConstraintSystem<F>>(
        &self,
        cs: &mut CS,
        z: &[AllocatedNum<F>]
    ) -> Result<Vec<AllocatedNum<F>>, SynthesisError> {
        // Implement risk calculation in-circuit
        // Weight each parameter and compute aggregate risk
        let weighted_risk = self.compute_weighted_risk(cs, z)?;
        
        // Apply decay factor for previous decisions
        let decayed_previous = self.previous_risk
            .mul(cs.namespace(|| "decay"), &DECAY_FACTOR)?;
            
        // Compute new aggregate risk
        let new_risk = weighted_risk
            .add(cs.namespace(|| "aggregate"), &decayed_previous)?;
            
        Ok(vec![new_risk])
    }
}
```

#### 1.3 Implement Nova Prover
```rust
// src/prover/nova_prover.rs
use arecibo::{
    CompressedSNARK, PublicParams, RecursiveSNARK,
    provider::{PallasEngine, VestaEngine},
};

pub struct NovaJOLTProver {
    pp: PublicParams<E1, E2>,
    recursive_snark: Option<RecursiveSNARK<E1, E2>>,
    iteration: usize,
}

impl NovaJOLTProver {
    pub fn new() -> Result<Self> {
        let circuit = JOLTDecisionCircuit::default();
        let pp = PublicParams::setup(circuit, &*ENGINE_PARAMS)?;
        
        Ok(Self {
            pp,
            recursive_snark: None,
            iteration: 0,
        })
    }
    
    pub fn fold_decision(
        &mut self,
        decision: JOLTDecision
    ) -> Result<FoldedProof> {
        let circuit = JOLTDecisionCircuit::from(decision);
        
        match &mut self.recursive_snark {
            None => {
                // Initialize with first decision
                self.recursive_snark = Some(
                    RecursiveSNARK::new(&self.pp, &circuit)?
                );
            }
            Some(snark) => {
                // Fold new decision into existing proof
                snark.prove_step(&self.pp, &circuit)?;
            }
        }
        
        self.iteration += 1;
        
        // Return intermediate proof state
        Ok(FoldedProof {
            iteration: self.iteration,
            commitment: self.get_commitment(),
        })
    }
    
    pub fn compress(&self) -> Result<CompressedProof> {
        let snark = self.recursive_snark.as_ref()
            .ok_or("No proof to compress")?;
            
        CompressedSNARK::prove(&self.pp, snark)
    }
}
```

---

### Phase 2: FFI Bindings (Week 2-3)

#### 2.1 Create Node.js Bindings
```rust
// src/ffi/node_bindings.rs
use neon::prelude::*;
use crate::prover::NovaJOLTProver;

fn initialize_prover(mut cx: FunctionContext) -> JsResult<JsBox<NovaJOLTProver>> {
    let prover = NovaJOLTProver::new()
        .or_else(|e| cx.throw_error(e.to_string()))?;
    Ok(cx.boxed(prover))
}

fn fold_decision(mut cx: FunctionContext) -> JsResult<JsObject> {
    let prover = cx.argument::<JsBox<NovaJOLTProver>>(0)?;
    let decision_obj = cx.argument::<JsObject>(1)?;
    
    // Extract 14 parameters from JS object
    let decision = parse_jolt_decision(&mut cx, decision_obj)?;
    
    // Perform Nova folding
    let proof = prover.borrow_mut().fold_decision(decision)
        .or_else(|e| cx.throw_error(e.to_string()))?;
    
    // Return proof object to JS
    let result = JsObject::new(&mut cx);
    result.set(&mut cx, "iteration", cx.number(proof.iteration))?;
    result.set(&mut cx, "commitment", cx.string(hex::encode(proof.commitment)))?;
    
    Ok(result)
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("initializeProver", initialize_prover)?;
    cx.export_function("foldDecision", fold_decision)?;
    cx.export_function("compressProof", compress_proof)?;
    cx.export_function("generateVerifier", generate_verifier)?;
    Ok(())
}
```

#### 2.2 Build Native Module
```json
// package.json
{
  "scripts": {
    "build:rust": "cargo-cp-artifact -nc index.node -- cargo build --release",
    "build:neon": "npm run build:rust && node-gyp rebuild"
  },
  "dependencies": {
    "neon-cli": "^0.10.1",
    "cargo-cp-artifact": "^0.1.8"
  }
}
```

#### 2.3 JavaScript Wrapper
```javascript
// src/nova-wrapper.js
const nova = require('../native/index.node');

class RealNovaAccumulator {
    constructor() {
        this.prover = nova.initializeProver();
        this.proofHistory = [];
    }
    
    async fold(joltDecision) {
        // Convert JS decision to Rust format
        const rustDecision = {
            amount: Math.floor(joltDecision.amount * 1e6),
            recipient_risk: Math.floor(joltDecision.recipientRisk * 1000),
            sender_history: Math.floor(joltDecision.senderHistory * 1000),
            // ... other 11 parameters
        };
        
        // Perform real Nova folding
        const foldedProof = await nova.foldDecision(this.prover, rustDecision);
        
        this.proofHistory.push(foldedProof);
        
        return {
            step: foldedProof.iteration,
            commitment: foldedProof.commitment,
            aggregateRisk: this.calculateAggregateRisk(),
            isValid: true
        };
    }
    
    async compress() {
        // Generate compressed SNARK for on-chain verification
        return nova.compressProof(this.prover);
    }
    
    async generateVerifier() {
        // Generate Solidity contract for this specific proof
        return nova.generateVerifier(this.prover);
    }
}

module.exports = RealNovaAccumulator;
```

---

### Phase 3: Smart Contract Generation (Week 3-4)

#### 3.1 Verifier Contract Generator
```rust
// src/verifier/contract_generator.rs
use arecibo::provider::bn256_grumpkin::bn256::Bn256EngineKZG;
use askama::Template;

#[derive(Template)]
#[template(path = "nova_verifier.sol")]
struct VerifierContract {
    vk_alpha: String,
    vk_beta: String,
    vk_gamma: String,
    vk_delta: String,
    ic: Vec<String>,
}

pub fn generate_solidity_verifier(
    pp: &PublicParams
) -> Result<String> {
    let vk = pp.verifying_key();
    
    let contract = VerifierContract {
        vk_alpha: encode_g1(&vk.alpha_g1),
        vk_beta: encode_g2(&vk.beta_g2),
        vk_gamma: encode_g2(&vk.gamma_g2),
        vk_delta: encode_g2(&vk.delta_g2),
        ic: vk.ic.iter().map(encode_g1).collect(),
    };
    
    Ok(contract.render()?)
}
```

#### 3.2 Template for Solidity Contract
```solidity
// templates/nova_verifier.sol
pragma solidity ^0.8.19;

contract NovaVerifier {
    using Pairing for *;
    
    struct VerifyingKey {
        Pairing.G1Point alpha;
        Pairing.G2Point beta;
        Pairing.G2Point gamma;
        Pairing.G2Point delta;
        Pairing.G1Point[] ic;
    }
    
    VerifyingKey verifyingKey;
    
    constructor() {
        verifyingKey.alpha = Pairing.G1Point({{ vk_alpha }});
        verifyingKey.beta = Pairing.G2Point({{ vk_beta }});
        verifyingKey.gamma = Pairing.G2Point({{ vk_gamma }});
        verifyingKey.delta = Pairing.G2Point({{ vk_delta }});
        {% for point in ic %}
        verifyingKey.ic.push(Pairing.G1Point({{ point }}));
        {% endfor %}
    }
    
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[] memory input
    ) public view returns (bool) {
        // Actual Nova verification logic
        return Pairing.pairing(
            Pairing.negate(a),
            b,
            verifyingKey.alpha,
            verifyingKey.beta,
            vk_x,
            verifyingKey.gamma,
            c,
            verifyingKey.delta
        );
    }
}
```

---

### Phase 4: Integration & Migration (Week 4-5)

#### 4.1 Update Backend Service
```javascript
// backend/nova-jolt-gateway-backend.js
const RealNovaAccumulator = require('./nova-wrapper');
const SimulatedNovaAccumulator = require('./simulated-nova');

// Feature flag for gradual rollout
const USE_REAL_NOVA = process.env.USE_REAL_NOVA === 'true';

class AuthorizationState {
    constructor() {
        this.novaAccumulator = USE_REAL_NOVA 
            ? new RealNovaAccumulator()
            : new SimulatedNovaAccumulator();
    }
    
    async addDecision(decision) {
        const proof = await this.novaAccumulator.fold(decision);
        
        if (USE_REAL_NOVA) {
            // Store real proof commitment
            await this.storeProofCommitment(proof.commitment);
        }
        
        return proof;
    }
    
    async finalizeForOnChain() {
        if (USE_REAL_NOVA) {
            // Generate compressed proof for on-chain verification
            const compressed = await this.novaAccumulator.compress();
            
            // Deploy verifier if needed
            if (!this.verifierAddress) {
                const verifierCode = await this.novaAccumulator.generateVerifier();
                this.verifierAddress = await this.deployVerifier(verifierCode);
            }
            
            return {
                proof: compressed,
                verifier: this.verifierAddress
            };
        } else {
            return this.simulatedFinalization();
        }
    }
}
```

#### 4.2 Migration Script
```javascript
// scripts/migrate-to-real-nova.js
const { ethers } = require('hardhat');

async function migrateToRealNova() {
    console.log('🚀 Migrating to Real Nova Implementation\n');
    
    // Step 1: Generate new verifier contract
    const nova = new RealNovaAccumulator();
    const verifierCode = await nova.generateVerifier();
    
    // Step 2: Deploy new verifier
    const VerifierFactory = await ethers.getContractFactory('NovaVerifier');
    const verifier = await VerifierFactory.deploy();
    await verifier.deployed();
    
    console.log('✅ Nova Verifier deployed:', verifier.address);
    
    // Step 3: Update backend configuration
    const config = {
        USE_REAL_NOVA: true,
        NOVA_VERIFIER_ADDRESS: verifier.address,
        MIGRATION_BLOCK: await ethers.provider.getBlockNumber()
    };
    
    await fs.writeFileSync('.env.production', Object.entries(config)
        .map(([k, v]) => `${k}=${v}`).join('\n'));
    
    // Step 4: Run verification tests
    await runVerificationTests(verifier);
    
    console.log('✅ Migration complete!');
}
```

---

## 📋 Testing Strategy

### Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_nova_folding() {
        let mut prover = NovaJOLTProver::new().unwrap();
        
        // Test single decision
        let decision1 = create_test_decision(0.3);
        let proof1 = prover.fold_decision(decision1).unwrap();
        assert_eq!(proof1.iteration, 1);
        
        // Test folding multiple decisions
        let decision2 = create_test_decision(0.4);
        let proof2 = prover.fold_decision(decision2).unwrap();
        assert_eq!(proof2.iteration, 2);
        
        // Verify proof is valid
        let compressed = prover.compress().unwrap();
        assert!(verify_proof(&compressed));
    }
}
```

### Integration Tests
```javascript
// tests/test-real-nova-integration.js
describe('Real Nova Integration', () => {
    it('should fold multiple JOLT decisions', async () => {
        const nova = new RealNovaAccumulator();
        
        // Add 3 decisions
        const proof1 = await nova.fold(createDecision(0.2));
        const proof2 = await nova.fold(createDecision(0.3));
        const proof3 = await nova.fold(createDecision(0.4));
        
        expect(proof3.step).toBe(3);
        expect(proof3.commitment).toMatch(/^0x[a-f0-9]{64}$/);
    });
    
    it('should generate valid on-chain proof', async () => {
        const nova = new RealNovaAccumulator();
        
        // Add decisions
        await nova.fold(createDecision(0.2));
        await nova.fold(createDecision(0.3));
        
        // Compress for on-chain
        const compressed = await nova.compress();
        
        // Deploy and verify
        const verifier = await deployVerifier(nova);
        const isValid = await verifier.verifyProof(compressed);
        
        expect(isValid).toBe(true);
    });
});
```

---

## 🎯 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Proof Generation Time | < 2s per fold | Benchmark tests |
| Compression Time | < 10s | Time compress() call |
| On-chain Verification Gas | < 300k | Hardhat gas reporter |
| Proof Size | < 1KB compressed | Check bytes length |
| Security Level | 128-bit | Cryptographic analysis |

---

## 🚨 Risk Mitigation

### Risk 1: Performance Degradation
**Mitigation**: Keep simulated version as fallback, use feature flags

### Risk 2: Rust Compilation Issues
**Mitigation**: Use Docker container with pre-configured Rust environment

### Risk 3: On-chain Gas Costs
**Mitigation**: Optimize circuit constraints, use proof batching

### Risk 4: Breaking Changes in Arecibo
**Mitigation**: Pin to specific commit, maintain fork

---

## 📅 Timeline

| Week | Tasks | Deliverable |
|------|-------|-------------|
| 1 | Rust setup, circuit implementation | Working Nova circuit |
| 2 | FFI bindings, Node integration | JS can call Rust Nova |
| 3 | Contract generation, deployment | On-chain verifier |
| 4 | Integration, testing | Feature flag rollout |
| 5 | Migration, monitoring | Production ready |

---

## 💰 Resource Requirements

- **Developer**: 1 Rust engineer + 1 Solidity engineer
- **Infrastructure**: Rust build server, test nodes
- **Budget**: ~$50k for 5 weeks
- **Dependencies**: Arecibo library, FFI toolchain

---

## ✅ Definition of Done

- [ ] Real Nova folding working in Rust
- [ ] Node.js can call Rust functions via FFI
- [ ] Solidity verifier auto-generated and deployed
- [ ] All tests passing with real cryptography
- [ ] Performance metrics meet targets
- [ ] Documentation updated
- [ ] Production deployment successful

---

## 📚 References

- [Arecibo Repository](https://github.com/wyattbenno777/arecibo/tree/wyatt_dev)
- [Nova Paper](https://eprint.iacr.org/2021/370)
- [Neon Bindings Guide](https://neon-bindings.com/)
- [Circuit Optimization Tips](https://github.com/arkworks-rs/r1cs-tutorial)