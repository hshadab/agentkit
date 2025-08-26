#!/usr/bin/env python3
import os

main_rs_path = os.path.expanduser("~/agentkit/src/main.rs")

with open(main_rs_path, 'r') as f:
    content = f.read()

# Check if fix already exists
if 'metadata.function == "verify_proof"' in content:
    print("✅ verify_proof check already exists!")
    exit(0)

# Find the exact location - after metadata parsing, before additional_context check
search_pattern = '''        // Parse metadata
        if let Ok(metadata) = serde_json::from_value::<ProofMetadata>(metadata_value.clone()) {
            // Check if this is a verification request
            if let Some(context) = &metadata.additional_context {'''

replacement_pattern = '''        // Parse metadata
        if let Ok(metadata) = serde_json::from_value::<ProofMetadata>(metadata_value.clone()) {
            // Check if this is a verification request by function name
            if metadata.function == "verify_proof" {
                info!("Processing verification request for function: verify_proof");
                if let Some(proof_id_arg) = metadata.arguments.get(0) {
                    let proof_id = proof_id_arg.trim().to_string();
                    info!("Verifying proof: {}", proof_id);
                    tokio::spawn(verify_proof(state.clone(), proof_id, metadata));
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
            
            // Check if this is a verification request
            if let Some(context) = &metadata.additional_context {'''

if search_pattern in content:
    # Backup
    with open(main_rs_path + '.backup_exact_fix', 'w') as f:
        f.write(content)
    
    # Apply fix
    new_content = content.replace(search_pattern, replacement_pattern)
    
    with open(main_rs_path, 'w') as f:
        f.write(new_content)
    
    print("✅ Applied exact verify_proof routing fix!")
    print("The fix adds a check for function == 'verify_proof' right after metadata parsing")
else:
    print("❌ Could not find exact pattern match")
    print("Manual fix needed - add verify_proof check after line 157")
