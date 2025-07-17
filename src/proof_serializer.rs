use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// Structure matching zkEngine's public.json format
#[derive(Debug, Serialize, Deserialize)]
pub struct ZKEnginePublicInputs {
    pub execution_z0: Vec<String>,
    #[serde(rename = "IC_i")]
    pub ic_i: String,
    pub ops_z0: Vec<String>,
    #[serde(rename = "ops_IC_i")]
    pub ops_ic_i: String,
    pub scan_z0: Vec<String>,
    #[serde(rename = "scan_IC_i")]
    pub scan_ic_i: Vec<String>,
}

/// Ethereum-compatible serialized proof format
#[derive(Debug, Serialize)]
pub struct EthereumProofData {
    /// Flattened proof data for smart contract
    pub proof_data: Vec<u8>,
    /// Public inputs formatted for EVM
    pub public_inputs: Vec<[u8; 32]>,
    /// Metadata for frontend
    pub metadata: ProofMetadata,
}

#[derive(Debug, Serialize)]
pub struct ProofMetadata {
    pub proof_type: String,
    pub proof_id: String,
    pub timestamp: u64,
    pub step_size: u32,
}

/// Serialize zkEngine proof for Ethereum verification
pub fn serialize_for_ethereum(
    proof_dir: &Path,
    proof_id: &str,
    proof_type: &str,
) -> Result<EthereumProofData, Box<dyn std::error::Error>> {
    // Read public inputs
    let public_json_path = proof_dir.join("public.json");
    let public_json = fs::read_to_string(&public_json_path)?;
    let public_inputs: ZKEnginePublicInputs = serde_json::from_str(&public_json)?;
    
    // Read binary proof (in production, this would be properly deserialized)
    let proof_bin_path = proof_dir.join("proof.bin");
    let proof_binary = fs::read(&proof_bin_path)?;
    
    // For mock implementation, we'll create a compressed representation
    // In production, this would involve:
    // 1. Deserializing the Nova proof structure
    // 2. Extracting commitments and evaluation proofs
    // 3. Formatting for efficient EVM verification
    
    // Convert hex strings to bytes
    let mut evm_public_inputs = Vec::new();
    
    // Add execution_z0
    for val in &public_inputs.execution_z0 {
        evm_public_inputs.push(hex_to_bytes32(val)?);
    }
    
    // Add IC_i
    evm_public_inputs.push(hex_to_bytes32(&public_inputs.ic_i)?);
    
    // Add ops_z0 (first 6 elements)
    for val in public_inputs.ops_z0.iter().take(6) {
        evm_public_inputs.push(hex_to_bytes32(val)?);
    }
    
    // Create mock compressed proof
    // In production, this would be actual proof data
    let compressed_proof = create_mock_compressed_proof(&proof_binary);
    
    Ok(EthereumProofData {
        proof_data: compressed_proof,
        public_inputs: evm_public_inputs,
        metadata: ProofMetadata {
            proof_type: proof_type.to_string(),
            proof_id: proof_id.to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            step_size: 50, // From metadata
        },
    })
}

/// Convert hex string to 32-byte array
fn hex_to_bytes32(hex: &str) -> Result<[u8; 32], Box<dyn std::error::Error>> {
    let hex = hex.trim_start_matches("0x");
    let bytes = hex::decode(hex)?;
    
    let mut result = [0u8; 32];
    let len = bytes.len().min(32);
    result[32 - len..].copy_from_slice(&bytes[..len]);
    
    Ok(result)
}

/// Create mock compressed proof for demonstration
/// In production, this would implement actual Nova proof compression
fn create_mock_compressed_proof(proof_binary: &[u8]) -> Vec<u8> {
    use sha2::{Sha256, Digest};
    
    // For mock: Create a hash-based "compressed" proof
    let mut hasher = Sha256::new();
    hasher.update(proof_binary);
    let hash = hasher.finalize();
    
    // Mock compressed proof structure:
    // [commitment_w: 32 bytes][commitment_e: 32 bytes][evaluation_proof: 64 bytes]
    let mut compressed = Vec::with_capacity(128);
    compressed.extend_from_slice(&hash[..32]); // Mock commitment W
    compressed.extend_from_slice(&hash[..32]); // Mock commitment E (reuse for demo)
    compressed.extend_from_slice(&[0u8; 64]);   // Mock evaluation proofs
    
    compressed
}

/// Export proof for Ethereum verification endpoint
pub async fn export_proof_for_ethereum(
    proof_id: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let proofs_dir = std::env::var("PROOFS_DIR").unwrap_or_else(|_| "./proofs".to_string());
    let proof_dir = Path::new(&proofs_dir).join(proof_id);
    
    // Read metadata to get proof type
    let metadata_path = proof_dir.join("metadata.json");
    let metadata_json = fs::read_to_string(&metadata_path)?;
    let metadata: serde_json::Value = serde_json::from_str(&metadata_json)?;
    let proof_type = metadata["function"].as_str().unwrap_or("unknown");
    
    // Serialize for Ethereum
    let eth_proof = serialize_for_ethereum(&proof_dir, proof_id, proof_type)?;
    
    // Return as JSON
    Ok(serde_json::to_string(&eth_proof)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_hex_to_bytes32() {
        let hex = "0100000000000000000000000000000000000000000000000000000000000000";
        let bytes = hex_to_bytes32(hex).unwrap();
        assert_eq!(bytes[0], 1);
        assert_eq!(bytes[31], 0);
    }
}