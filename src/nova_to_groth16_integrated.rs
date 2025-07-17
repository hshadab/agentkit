use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use std::time::Instant;
use sha2::{Sha256, Digest};

#[derive(Debug, Serialize, Deserialize)]
pub struct Groth16Proof {
    pub a: [String; 2],
    pub b: [[String; 2]; 2],
    pub c: [String; 2],
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IntegratedProofData {
    pub proof: Groth16Proof,
    pub public_signals: Vec<String>,
    pub proof_id_bytes32: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct CircuitInput {
    // Public inputs
    #[serde(rename = "novaProofCommitment")]
    nova_proof_commitment: String,
    #[serde(rename = "proofType")]
    proof_type: String,
    timestamp: String,
    #[serde(rename = "userAddress")]
    user_address: String,
    
    // Private witnesses
    #[serde(rename = "novaProofHash")]
    nova_proof_hash: String,
    #[serde(rename = "executionStepCount")]
    execution_step_count: String,
    #[serde(rename = "finalStateHash")]
    final_state_hash: String,
    #[serde(rename = "verificationSeed")]
    verification_seed: String,
    
    // Proof-type specific
    #[serde(rename = "kycData")]
    kyc_data: String,
    #[serde(rename = "locationData")]
    location_data: String,
    #[serde(rename = "aiContentHash")]
    ai_content_hash: String,
}

/// Integrated Nova to Groth16 conversion using snarkjs directly from Rust
pub async fn convert_nova_to_groth16_integrated(
    proof_dir: &Path,
    proof_id: &str,
) -> Result<IntegratedProofData, Box<dyn std::error::Error + Send + Sync>> {
    let start = Instant::now();
    eprintln!("🔧 Integrated Nova→Groth16 conversion for {}", proof_id);
    
    // Read Nova proof data
    let metadata_path = proof_dir.join("metadata.json");
    let public_path = proof_dir.join("public.json");
    let proof_path = proof_dir.join("proof.bin");
    
    // Read metadata
    let metadata_json = tokio::fs::read_to_string(&metadata_path).await?;
    let metadata: serde_json::Value = serde_json::from_str(&metadata_json)?;
    
    // Read public inputs
    let public_json = tokio::fs::read_to_string(&public_path).await?;
    let public_inputs: serde_json::Value = serde_json::from_str(&public_json)?;
    
    // Determine proof type
    let proof_type = match metadata["function"].as_str() {
        Some("prove_kyc") => 1,
        Some("prove_location") => 2,
        Some("prove_ai_content") => 3,
        _ => 0,
    };
    
    // Generate circuit inputs from Nova proof
    let circuit_input = prepare_circuit_input(
        proof_id,
        &metadata,
        &public_inputs,
        proof_type,
    )?;
    
    // Write circuit input to temporary file
    let input_path = proof_dir.join("groth16_input.json");
    let input_json = serde_json::to_string_pretty(&circuit_input)?;
    tokio::fs::write(&input_path, &input_json).await?;
    
    // Call snarkjs directly from Rust
    let wasm_path = std::env::current_dir()?.join("build/RealProofOfProof_js/RealProofOfProof_js/RealProofOfProof.wasm");
    let zkey_path = std::env::current_dir()?.join("build/real_proof_of_proof_final.zkey");
    
    // Generate Groth16 proof using snarkjs
    let output = Command::new("node")
        .arg("-e")
        .arg(format!(
            r#"
            const snarkjs = require('snarkjs');
            const fs = require('fs');
            
            async function prove() {{
                try {{
                    const input = JSON.parse(fs.readFileSync('{}', 'utf8'));
                    const {{ proof, publicSignals }} = await snarkjs.groth16.fullProve(
                        input,
                        '{}',
                        '{}'
                    );
                    
                    // Format for Ethereum
                    const formatted = {{
                        proof: {{
                            a: [proof.pi_a[0], proof.pi_a[1]],
                            b: [[proof.pi_b[0][1], proof.pi_b[0][0]], 
                                [proof.pi_b[1][1], proof.pi_b[1][0]]],
                            c: [proof.pi_c[0], proof.pi_c[1]]
                        }},
                        publicSignals: publicSignals
                    }};
                    
                    console.log(JSON.stringify(formatted));
                }} catch (error) {{
                    console.error('Error in prove():', error);
                    process.exit(1);
                }}
            }}
            
            prove();
            "#,
            input_path.display(),
            wasm_path.display(),
            zkey_path.display()
        ))
        .output()?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        eprintln!("Node.js stderr: {}", error);
        return Err(format!("Groth16 generation failed: {}", error).into());
    }
    
    let output_json = String::from_utf8(output.stdout)?;
    eprintln!("Node.js output: {}", output_json);
    let proof_result: serde_json::Value = serde_json::from_str(&output_json)?;
    
    // Extract proof components
    let proof = Groth16Proof {
        a: [
            proof_result["proof"]["a"][0].as_str().unwrap().to_string(),
            proof_result["proof"]["a"][1].as_str().unwrap().to_string(),
        ],
        b: [
            [
                proof_result["proof"]["b"][0][0].as_str().unwrap().to_string(),
                proof_result["proof"]["b"][0][1].as_str().unwrap().to_string(),
            ],
            [
                proof_result["proof"]["b"][1][0].as_str().unwrap().to_string(),
                proof_result["proof"]["b"][1][1].as_str().unwrap().to_string(),
            ],
        ],
        c: [
            proof_result["proof"]["c"][0].as_str().unwrap().to_string(),
            proof_result["proof"]["c"][1].as_str().unwrap().to_string(),
        ],
    };
    
    // Extract public signals
    let public_signals: Vec<String> = proof_result["publicSignals"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap().to_string())
        .collect();
    
    // Generate proof ID bytes32
    let proof_id_bytes32 = format!("0x{}", hex::encode(&proof_id.as_bytes()[..32.min(proof_id.len())]));
    
    let elapsed = start.elapsed();
    eprintln!("✅ Integrated conversion completed in {:?}", elapsed);
    eprintln!("   Public signals: {} values", public_signals.len());
    
    // Clean up temporary file
    tokio::fs::remove_file(&input_path).await.ok();
    
    Ok(IntegratedProofData {
        proof,
        public_signals,
        proof_id_bytes32,
    })
}

fn prepare_circuit_input(
    proof_id: &str,
    metadata: &serde_json::Value,
    public_inputs: &serde_json::Value,
    proof_type: u32,
) -> Result<CircuitInput, Box<dyn std::error::Error + Send + Sync>> {
    // Hash the Nova proof data to create commitment
    let nova_proof_data = serde_json::json!({
        "proofId": proof_id,
        "publicInputs": public_inputs,
        "metadata": metadata
    });
    
    let nova_proof_hash = hash_to_field(&serde_json::to_string(&nova_proof_data)?);
    
    // Compute commitment using SHA256 (matching the JS implementation)
    let commitment = compute_commitment(&nova_proof_hash, proof_type, &metadata);
    
    // Extract execution details
    let step_count = public_inputs["num_steps"]
        .as_u64()
        .or_else(|| public_inputs["step_count"].as_u64())
        .unwrap_or(1000);
    
    let final_state = public_inputs["final_state"]
        .as_str()
        .or_else(|| public_inputs["execution_result"].as_str())
        .unwrap_or("default_state");
    
    let final_state_hash = hash_to_field(final_state);
    
    // Generate verification seed
    let seed = rand::random::<u128>();
    let verification_seed = (seed % field_prime()).to_string();
    
    // Current timestamp
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)?
        .as_secs();
    
    // Proof-type specific data
    let (kyc_data, location_data, ai_content_hash) = match proof_type {
        1 => (hash_to_field("kyc_verified"), "0".to_string(), "0".to_string()),
        2 => ("0".to_string(), hash_to_field("location_verified"), "0".to_string()),
        3 => ("0".to_string(), "0".to_string(), hash_to_field("ai_content_verified")),
        _ => ("0".to_string(), "0".to_string(), "0".to_string()),
    };
    
    Ok(CircuitInput {
        nova_proof_commitment: commitment,
        proof_type: proof_type.to_string(),
        timestamp: timestamp.to_string(),
        user_address: "1234567890123456789012345678901234567890".to_string(), // Placeholder
        nova_proof_hash,
        execution_step_count: step_count.to_string(),
        final_state_hash,
        verification_seed,
        kyc_data,
        location_data,
        ai_content_hash,
    })
}

fn hash_to_field(data: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data.as_bytes());
    let hash = hasher.finalize();
    
    // Take first 31 bytes to ensure it's less than field prime
    let field_element = num_bigint::BigUint::from_bytes_be(&hash[..31]);
    let field_prime = field_prime();
    
    (field_element % field_prime).to_string()
}

fn compute_commitment(nova_proof_hash: &str, proof_type: u32, metadata: &serde_json::Value) -> String {
    // Simplified commitment computation
    let mut hasher = Sha256::new();
    hasher.update(nova_proof_hash.as_bytes());
    hasher.update(proof_type.to_string().as_bytes());
    hasher.update(serde_json::to_string(metadata).unwrap_or_default().as_bytes());
    
    let hash = hasher.finalize();
    let commitment = num_bigint::BigUint::from_bytes_be(&hash[..31]);
    let field_prime = field_prime();
    
    (commitment % field_prime).to_string()
}

fn field_prime() -> num_bigint::BigUint {
    num_bigint::BigUint::parse_bytes(
        b"21888242871839275222246405745257275088548364400416034343698204186575808495617",
        10
    ).unwrap()
}