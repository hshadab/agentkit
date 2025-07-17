use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct Groth16Proof {
    pub a: [String; 2],
    pub b: [[String; 2]; 2],
    pub c: [String; 2],
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EthereumProofData {
    pub proof: Groth16Proof,
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

/// Convert Nova proof to Groth16 format for Ethereum using real SNARK generation
pub async fn convert_nova_to_groth16(
    proof_dir: &Path,
    proof_id: &str,
) -> Result<EthereumProofData, Box<dyn std::error::Error + Send + Sync>> {
    eprintln!("Converting Nova proof {} to Groth16 using real SNARK generation", proof_id);
    
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
    
    // Call the SNARK generation service
    let client = reqwest::Client::new();
    let snark_service_url = "http://localhost:8003/generate-snark";
    
    let request_body = serde_json::json!({
        "proofId": proof_id,
        "proofDir": proof_dir.to_str().unwrap()
    });
    
    eprintln!("Calling SNARK generation service at {}", snark_service_url);
    
    let response = match client
        .post(snark_service_url)
        .json(&request_body)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            eprintln!("Failed to connect to SNARK service: {}", e);
            eprintln!("Make sure the SNARK service is running: node src/snark_generation_service.js");
            return Err(format!("SNARK service connection failed: {}", e).into());
        }
    };
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        eprintln!("SNARK service error: {}", error_text);
        return Err(format!("SNARK generation failed: {}", error_text).into());
    }
    
    let snark_response: serde_json::Value = response.json().await?;
    
    if !snark_response["success"].as_bool().unwrap_or(false) {
        let error = snark_response["error"].as_str().unwrap_or("Unknown error");
        return Err(format!("SNARK generation failed: {}", error).into());
    }
    
    let ethereum_data = &snark_response["ethereum_data"];
    
    // Extract the proof components
    let proof = Groth16Proof {
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
    
    eprintln!("✅ Real SNARK proof generated successfully");
    eprintln!("   Public signals: {} values", public_signals.len());
    
    // Extract commitment from first public signal
    let commitment = public_signals.get(0)
        .cloned()
        .unwrap_or_else(|| "0x0000000000000000000000000000000000000000000000000000000000000000".to_string());
    
    // Extract timestamp from public signal or use current time
    let timestamp = public_signals.get(2)
        .and_then(|t| t.trim_start_matches("0x").parse::<u64>().ok())
        .unwrap_or_else(|| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs()
        });
    
    // Return the Ethereum-formatted data
    let ethereum_result = EthereumProofData {
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