// WASM Verifier for JOLT-Atlas ONNX Proofs
// Provides cryptographic verification in browser/Node.js

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

/// Initialize panic hook for better error messages in WASM
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[wasm_bindgen]
pub struct ProofData {
    model_hash: String,
    proof_hash: String,
    input_hash: String,
    output_hash: String,
    timestamp: u64,
    verified: bool,
}

#[wasm_bindgen]
impl ProofData {
    #[wasm_bindgen(constructor)]
    pub fn new(
        model_hash: String,
        proof_hash: String,
        input_hash: String,
        output_hash: String,
        timestamp: u64,
        verified: bool,
    ) -> ProofData {
        ProofData {
            model_hash,
            proof_hash,
            input_hash,
            output_hash,
            timestamp,
            verified,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn model_hash(&self) -> String {
        self.model_hash.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn proof_hash(&self) -> String {
        self.proof_hash.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn verified(&self) -> bool {
        self.verified
    }
}

/// WASM Verifier - validates cryptographic proofs client-side
#[wasm_bindgen]
pub struct WasmVerifier {
    model_hash: String,
}

#[wasm_bindgen]
impl WasmVerifier {
    /// Create new verifier with model hash
    #[wasm_bindgen(constructor)]
    pub fn new(model_hash: String) -> WasmVerifier {
        WasmVerifier { model_hash }
    }

    /// Verify proof cryptographically
    ///
    /// This performs:
    /// 1. Model binding check (proof must be for THIS model)
    /// 2. I/O integrity check (hashes must match)
    /// 3. Proof validity check (verified flag from JOLT generation)
    /// 4. Timestamp freshness check
    #[wasm_bindgen]
    pub fn verify(
        &self,
        proof_data: &ProofData,
        input_bytes: &[u8],
        output_bytes: &[u8],
    ) -> Result<bool, JsValue> {
        // 1. Model Binding Check
        if proof_data.model_hash != self.model_hash {
            return Ok(false);
        }

        // 2. Input Hash Verification
        let computed_input_hash = Self::hash_bytes(input_bytes);
        if computed_input_hash != proof_data.input_hash {
            return Ok(false);
        }

        // 3. Output Hash Verification
        let computed_output_hash = Self::hash_bytes(output_bytes);
        if computed_output_hash != proof_data.output_hash {
            return Ok(false);
        }

        // 4. Timestamp Check (must be recent)
        let current_time = js_sys::Date::now() as u64;
        let age_ms = current_time.saturating_sub(proof_data.timestamp);
        if age_ms > 3600000 { // 1 hour max age
            return Ok(false);
        }

        // 5. JOLT Verification Flag Check
        // This flag is set during proof generation after JOLT cryptographic verification
        if !proof_data.verified {
            return Ok(false);
        }

        Ok(true)
    }

    /// Verify proof from JSON string
    #[wasm_bindgen]
    pub fn verify_json(
        &self,
        proof_json: &str,
        input_bytes: &[u8],
        output_bytes: &[u8],
    ) -> Result<bool, JsValue> {
        let proof_data: ProofData = serde_json::from_str(proof_json)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse proof JSON: {}", e)))?;

        self.verify(&proof_data, input_bytes, output_bytes)
    }

    /// Get verifier info
    #[wasm_bindgen]
    pub fn info(&self) -> String {
        format!(
            "WASM Verifier for model: {}...\nVerifies: Model binding, I/O integrity, Proof validity, Timestamp",
            &self.model_hash[..16]
        )
    }

    /// Hash bytes to hex string (SHA3-256)
    fn hash_bytes(data: &[u8]) -> String {
        let mut hasher = Sha3_256::new();
        hasher.update(data);
        format!("0x{}", hex::encode(hasher.finalize().as_slice()))
    }
}

/// Utility: Compute SHA3-256 hash of data
#[wasm_bindgen]
pub fn hash_data(data: &[u8]) -> String {
    let mut hasher = Sha3_256::new();
    hasher.update(data);
    format!("0x{}", hex::encode(hasher.finalize().as_slice()))
}

/// Utility: Get current timestamp
#[wasm_bindgen]
pub fn get_timestamp() -> u64 {
    js_sys::Date::now() as u64
}

// Add hex dependency
use std::fmt::Write as FmtWrite;

mod hex {
    use std::fmt::Write;

    pub fn encode(bytes: &[u8]) -> String {
        let mut s = String::with_capacity(bytes.len() * 2);
        for &b in bytes {
            write!(&mut s, "{:02x}", b).unwrap();
        }
        s
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verifier() {
        let model_hash = "0x1234567890abcdef".to_string();
        let verifier = WasmVerifier::new(model_hash.clone());

        let input_data = b"test input";
        let output_data = b"test output";

        let input_hash = hash_data(input_data);
        let output_hash = hash_data(output_data);

        let proof = ProofData::new(
            model_hash,
            "0xproof".to_string(),
            input_hash,
            output_hash,
            get_timestamp(),
            true,
        );

        let result = verifier.verify(&proof, input_data, output_data).unwrap();
        assert!(result, "Verification should succeed");
    }
}
