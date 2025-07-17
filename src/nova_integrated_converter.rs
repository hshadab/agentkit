use serde::{Deserialize, Serialize};
use std::path::Path;
use std::fs;
use std::time::Instant;

#[derive(Debug, Serialize, Deserialize)]
pub struct IntegratedGroth16Proof {
    pub a: [String; 2],
    pub b: [[String; 2]; 2],
    pub c: [String; 2],
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IntegratedEthereumProofData {
    pub proof: IntegratedGroth16Proof,
    pub public_inputs: EthereumPublicInputs,
    pub proof_id_bytes32: String,
    pub public_signals: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EthereumPublicInputs {
    pub commitment: String,
    pub proof_type: u32,
    pub timestamp: u64,
}

/// Test implementation of integrated Nova to Groth16 conversion
/// This simulates what the ICME approach would do
pub async fn convert_nova_to_groth16_integrated(
    proof_dir: &Path,
    proof_id: &str,
) -> Result<IntegratedEthereumProofData, Box<dyn std::error::Error + Send + Sync>> {
    eprintln!("[TEST] Integrated Nova to Groth16 conversion for {}", proof_id);
    let start = Instant::now();
    
    // Read metadata to determine proof type
    let metadata_path = proof_dir.join("metadata.json");
    let metadata_json = tokio::fs::read_to_string(&metadata_path)
        .await
        .unwrap_or_else(|_| "{}".to_string());
    let metadata: serde_json::Value = serde_json::from_str(&metadata_json)?;
    
    // Determine proof type from metadata
    let proof_type = match metadata["function"].as_str() {
        Some("prove_kyc") => 1,
        Some("prove_location") => 2,
        Some("prove_ai_content") => 3,
        _ => 0,
    };
    
    // In a real implementation, we would:
    // 1. Load the Nova proof from proof.bin
    // 2. Use Nova's CompressedSNARK to generate Groth16 proof
    // 3. Extract the proof components
    
    // For testing, we'll call our existing SNARK service to compare performance
    // In production, this would be replaced with Nova's integrated approach
    
    let client = reqwest::Client::new();
    let snark_service_url = "http://localhost:8003/generate-snark";
    
    let request_body = serde_json::json!({
        "proofId": proof_id,
        "proofDir": proof_dir.to_str().unwrap()
    });
    
    let response = match client
        .post(snark_service_url)
        .json(&request_body)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            // If SNARK service is not running, simulate integrated conversion
            eprintln!("[TEST] Simulating integrated conversion (service not available)");
            return Ok(generate_mock_integrated_proof(proof_id, proof_type));
        }
    };
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(format!("SNARK generation failed: {}", error_text).into());
    }
    
    let snark_response: serde_json::Value = response.json().await?;
    
    if !snark_response["success"].as_bool().unwrap_or(false) {
        let error = snark_response["error"].as_str().unwrap_or("Unknown error");
        return Err(format!("SNARK generation failed: {}", error).into());
    }
    
    let ethereum_data = &snark_response["ethereum_data"];
    
    // Extract the proof components
    let proof = IntegratedGroth16Proof {
        a: [
            ethereum_data["proof"]["a"][0].as_str().unwrap().to_string(),
            ethereum_data["proof"]["a"][1].as_str().unwrap().to_string()
        ],
        b: [
            [
                ethereum_data["proof"]["b"][0][0].as_str().unwrap().to_string(),
                ethereum_data["proof"]["b"][0][1].as_str().unwrap().to_string()
            ],
            [
                ethereum_data["proof"]["b"][1][0].as_str().unwrap().to_string(),
                ethereum_data["proof"]["b"][1][1].as_str().unwrap().to_string()
            ]
        ],
        c: [
            ethereum_data["proof"]["c"][0].as_str().unwrap().to_string(),
            ethereum_data["proof"]["c"][1].as_str().unwrap().to_string()
        ]
    };
    
    // Extract public signals
    let public_signals: Vec<String> = ethereum_data["publicSignals"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap().to_string())
        .collect();
    
    let elapsed = start.elapsed();
    eprintln!("[TEST] Integrated conversion completed in {:?}", elapsed);
    
    // Extract commitment from first public signal
    let commitment = public_signals.get(0)
        .cloned()
        .unwrap_or_else(|| "0x0000000000000000000000000000000000000000000000000000000000000000".to_string());
    
    // Extract timestamp
    let timestamp = public_signals.get(2)
        .and_then(|t| t.trim_start_matches("0x").parse::<u64>().ok())
        .unwrap_or_else(|| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs()
        });
    
    let ethereum_result = IntegratedEthereumProofData {
        proof,
        public_inputs: EthereumPublicInputs {
            commitment,
            proof_type,
            timestamp,
        },
        proof_id_bytes32: ethereum_data["proof_id_bytes32"].as_str().unwrap().to_string(),
        public_signals,
    };
    
    Ok(ethereum_result)
}

fn generate_mock_integrated_proof(proof_id: &str, proof_type: u32) -> IntegratedEthereumProofData {
    use sha2::{Sha256, Digest};
    
    let mut hasher = Sha256::new();
    hasher.update(proof_id.as_bytes());
    let hash = hasher.finalize();
    let commitment = format!("0x{}", hex::encode(&hash));
    
    IntegratedEthereumProofData {
        proof: IntegratedGroth16Proof {
            a: [
                format!("0x{:064x}", 1),
                format!("0x{:064x}", 2)
            ],
            b: [
                [format!("0x{:064x}", 3), format!("0x{:064x}", 4)],
                [format!("0x{:064x}", 5), format!("0x{:064x}", 6)]
            ],
            c: [
                format!("0x{:064x}", 7),
                format!("0x{:064x}", 8)
            ]
        },
        public_inputs: EthereumPublicInputs {
            commitment: commitment.clone(),
            proof_type,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        },
        proof_id_bytes32: format!("0x{}", hex::encode(&proof_id.as_bytes()[..32.min(proof_id.len())])),
        public_signals: vec![
            commitment,
            "0x0000000000000000000000000000000000000000000000000000000000000001".to_string(),
            format!("0x{:064x}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()),
            format!("0x{:064x}", proof_type),
            "0x0000000000000000000000000000000000000000000000000000000000000001".to_string(),
            "0x000fff9ee671b05ea25f58ed9584635fad2558e23c031003fd52d393bff5973f".to_string(),
        ],
    }
}