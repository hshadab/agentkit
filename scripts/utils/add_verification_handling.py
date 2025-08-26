#!/usr/bin/env python3
import re
import os

def update_rust_verification():
    main_rs = os.path.expanduser("~/agentkit/src/main.rs")
    
    with open(main_rs, 'r') as f:
        content = f.read()
    
    # Find the process_user_command function and update verification handling
    # This is a simplified fix - for complete fix, use the full artifact
    
    # Check if verify_proof handling already exists
    if 'if metadata.function == "verify_proof"' in content:
        print("✅ Verification handling already exists")
        return
    
    # Find where to insert the verification check
    insert_marker = 'if metadata.function == "list_proofs"'
    if insert_marker in content:
        # Insert verification handling before list_proofs
        verification_code = '''
            // Check if this is a verification request
            if metadata.function == "verify_proof" {
                info!("Processing verification request");
                
                // Extract the proof ID to verify from arguments
                if let Some(proof_id_to_verify) = metadata.arguments.get(0) {
                    // Clean up the proof ID
                    let clean_proof_id = proof_id_to_verify
                        .trim()
                        .strip_prefix("proof ")
                        .unwrap_or(proof_id_to_verify)
                        .to_string();
                    
                    info!("Verifying proof: {}", clean_proof_id);
                    
                    let verify_metadata = ProofMetadata {
                        function: "verify".to_string(),
                        arguments: vec![],
                        step_size: metadata.step_size,
                        explanation: "Verifying existing proof".to_string(),
                        additional_context: Some(json!({ "is_verification": true })),
                    };
                    
                    tokio::spawn(verify_proof(state.clone(), clean_proof_id, verify_metadata));
                } else {
                    error!("No proof ID provided for verification");
                    let err_msg = json!({
                        "type": "error",
                        "response": "No proof ID provided for verification"
                    });
                    let _ = state.tx.send(err_msg.to_string());
                }
                return;
            }
            
'''
        content = content.replace(insert_marker, verification_code + insert_marker)
        
        with open(main_rs, 'w') as f:
            f.write(content)
        
        print("✅ Added verification handling to main.rs")
    else:
        print("❌ Could not find insertion point - manual update required")

if __name__ == "__main__":
    update_rust_verification()
