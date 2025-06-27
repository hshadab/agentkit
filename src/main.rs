use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    response::{IntoResponse, Html},
    routing::get,
    Router,
    http::StatusCode,
};
use futures_util::{stream::StreamExt, SinkExt};
use serde_json::json;
use std::net::SocketAddr;
use tokio::sync::broadcast;
use tracing::{error, info};
use uuid::Uuid;
use std::process::Stdio;
use tokio::process::Command;
use std::path::PathBuf;

// --- Main State and Data Structures ---

#[derive(Clone)]
struct AppState {
    langchain_url: String,
    tx: broadcast::Sender<String>,
    zkengine_binary: String,
    proofs_dir: String,
    wasm_dir: String,
}

#[derive(serde::Deserialize, serde::Serialize, Clone, Debug)]
struct ProofMetadata {
    function: String,
    arguments: Vec<String>,
    step_size: u64,
    explanation: String,
    additional_context: Option<serde_json::Value>,
}

// --- Main Application ---

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    tracing_subscriber::fmt::init();

    // Load configuration from environment variables
    let langchain_url = std::env::var("LANGCHAIN_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8002".to_string());
    let zkengine_binary = std::env::var("ZKENGINE_BINARY")
        .unwrap_or_else(|_| "./zkengine/zkEngine".to_string());
    let proofs_dir = std::env::var("PROOFS_DIR")
        .unwrap_or_else(|_| "./proofs".to_string());
    let wasm_dir = std::env::var("WASM_DIR")
        .unwrap_or_else(|_| "./zkengine/example_wasms".to_string());
    
    // Create proofs directory if it doesn't exist
    std::fs::create_dir_all(&proofs_dir).ok();
    
    let (tx, _rx) = broadcast::channel(100);

    let state = AppState {
        langchain_url,
        tx,
        zkengine_binary,
        proofs_dir,
        wasm_dir,
    };

    let app = Router::new()
        .route("/", get(serve_index))
        .route("/index.html", get(serve_index))
        .route("/ws", get(websocket_handler))
        .route("/test", get(|| async { "Server is running!" }))
        .nest_service("/static", tower_http::services::ServeDir::new("static"))
        .with_state(state);


    let addr = SocketAddr::from(([0, 0, 0, 0], 8001));
    info!("🚀 Server listening on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

// --- WebSocket Handler ---

async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}


// --- Serve Index Function ---
async fn serve_index() -> Result<Html<String>, (StatusCode, String)> {
    match std::fs::read_to_string("static/index.html") {
        Ok(content) => Ok(Html(content)),
        Err(e) => {
            error!("Failed to read index.html: {}", e);
            Err((StatusCode::NOT_FOUND, format!("Could not read index.html: {}", e)))
        }
    }
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.tx.subscribe();

    // Task to forward broadcast messages to the client
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Task to handle incoming messages from this client
    let state_clone = state.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            tokio::spawn(process_user_command(state_clone.clone(), text));
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };
}

// --- Command Processing ---

async fn process_user_command(state: AppState, message: String) {
    let payload: serde_json::Value = match serde_json::from_str(&message) {
        Ok(val) => val,
        Err(_) => {
            error!("Failed to parse incoming message as JSON: {}", message);
            return;
        }
    };

    let client = reqwest::Client::new();
    let res = client
        .post(&format!("{}/chat", state.langchain_url))
        .json(&payload)
        .send()
        .await;

    match res {
        Ok(response) => {
            if let Ok(chat_response) = response.json::<serde_json::Value>().await {
                // Debug: Log the entire response
                info!("Chat response received: {:?}", chat_response);
                
                // Debug: Check if intent exists
                if let Some(intent) = chat_response.get("intent") {
                    info!("Intent found: {:?}", intent);
                } else {
                    info!("No intent found in response");
                }

                // Send the response to the UI
                let ui_message = json!({
                    "type": "chat_response",
                    "response": chat_response.get("response").and_then(|r| r.as_str()).unwrap_or(""),
                    "metadata": chat_response.get("metadata")
                });
                
                if state.tx.send(ui_message.to_string()).is_err() {
                    error!("Failed to broadcast message to clients");
                }
                
                // Check for an intent and route to appropriate handler
                if let Some(intent_val) = chat_response.get("intent") {
                    if let Ok(metadata) = serde_json::from_value::<ProofMetadata>(intent_val.clone()) {
                        let proof_id = chat_response.get("metadata")
                            .and_then(|m| m.get("proof_id"))
                            .and_then(|pid| pid.as_str())
                            .unwrap_or(&Uuid::new_v4().to_string())
                            .to_string();
                        
                        // Check if this is a verification request
                        if let Some(context) = &metadata.additional_context {
                            if context.get("is_verification").and_then(|v| v.as_bool()).unwrap_or(false) {
                                // This is a manual verification request
                                info!("Processing manual verification for {}", proof_id);
                                tokio::spawn(verify_proof(state.clone(), proof_id, metadata));
                                return;
                            }
                        }
                        
                        // Check if this is a list request
                        if metadata.function == "list_proofs" {
                            info!("Processing list proofs request");
                            tokio::spawn(list_proofs(state.clone(), metadata));
                            return;
                        }
                        
                        // Otherwise, generate a new proof
                        tokio::spawn(generate_proof(state.clone(), proof_id, metadata));
                    }
                }
            }
        }
        Err(e) => {
            error!("Failed to contact LangChain service: {}", e);
            let err_msg = json!({ 
                "type": "error",
                "response": "Error: The backend AI service is not available." 
            }).to_string();
            let _ = state.tx.send(err_msg);
        }
    }
}

// --- Proof Generation ---

async fn generate_proof(state: AppState, proof_id: String, metadata: ProofMetadata) {
    info!("Starting proof generation for {}", proof_id);
    
    // Send status update
    let status_msg = json!({
        "type": "proof_status",
        "proof_id": proof_id,
        "status": "generating",
        "message": "Generating proof...",
        "metadata": metadata
    });
    let _ = state.tx.send(status_msg.to_string());
    
    // Determine WASM file based on function
    let wasm_file = match metadata.function.as_str() {
        "prove_kyc" => "prove_kyc.wasm",
        "prove_ai_content" => "prove_ai_content.wasm",
        "prove_location" => "prove_location.wasm",
        "prove_custom" => {
            // Check additional context for specific custom proof
            metadata.additional_context
                .as_ref()
                .and_then(|ctx| ctx.get("wasm_file"))
                .and_then(|f| f.as_str())
                .unwrap_or("prime_checker.wasm")
        }
        _ => {
            error!("Unknown proof function: {}", metadata.function);
            let err_msg = json!({
                "type": "proof_error",
                "proof_id": proof_id,
                "error": format!("Unknown proof function: {}", metadata.function)
            });
            let _ = state.tx.send(err_msg.to_string());
            return;
        }
    };
    
    let wasm_path = PathBuf::from(&state.wasm_dir).join(wasm_file);
    let proof_dir = PathBuf::from(&state.proofs_dir).join(&proof_id);
    
    // Create proof directory
    if let Err(e) = std::fs::create_dir_all(&proof_dir) {
        error!("Failed to create proof directory: {}", e);
        return;
    }
    
    // Save metadata to file for later retrieval
    let metadata_path = proof_dir.join("metadata.json");
    if let Err(e) = std::fs::write(&metadata_path, serde_json::to_string_pretty(&metadata).unwrap()) {
        error!("Failed to save proof metadata: {}", e);
    }
    
    // Build zkEngine command
    let mut cmd = Command::new(&state.zkengine_binary);
    cmd.arg("prove")
        .arg("--wasm").arg(&wasm_path)
        .arg("--out-dir").arg(&proof_dir)
        .arg("--step").arg(metadata.step_size.to_string());
    
    // Add arguments
    for arg in &metadata.arguments {
        cmd.arg(arg);
    }
    
    cmd.stdout(Stdio::piped())
        .stderr(Stdio::piped());
    
    let start_time = std::time::Instant::now();
    
    match cmd.spawn() {
        Ok(child) => {
            match child.wait_with_output().await {
                Ok(output) => {
                    let duration = start_time.elapsed();
                    
                    if output.status.success() {
                        info!("Proof generated successfully for {}", proof_id);
                        
                        // Read proof size
                        let proof_path = proof_dir.join("proof.bin");
                        let proof_size = std::fs::metadata(&proof_path)
                            .map(|m| m.len())
                            .unwrap_or(0);
                        
                        let success_msg = json!({
                            "type": "proof_complete",
                            "proof_id": proof_id,
                            "status": "complete",
                            "metrics": {
                                "time_ms": duration.as_millis(),
                                "proof_size": proof_size
                            },
                            "metadata": metadata,
                            "additional_context": metadata.additional_context
                        });
                        let _ = state.tx.send(success_msg.to_string());
                        
                        // If this is an automated transfer, proceed to verification
                        if let Some(ref context) = metadata.additional_context {
                            if context.get("is_automated_transfer").and_then(|v| v.as_bool()).unwrap_or(false) {
                                tokio::spawn(verify_proof(state.clone(), proof_id.clone(), metadata.clone()));
                            }
                        }
                    } else {
                        error!("Proof generation failed: {}", String::from_utf8_lossy(&output.stderr));
                        let err_msg = json!({
                            "type": "proof_error",
                            "proof_id": proof_id,
                            "error": "Proof generation failed"
                        });
                        let _ = state.tx.send(err_msg.to_string());
                    }
                }
                Err(e) => {
                    error!("Failed to wait for zkEngine: {}", e);
                }
            }
        }
        Err(e) => {
            error!("Failed to spawn zkEngine process: {}", e);
            let err_msg = json!({
                "type": "proof_error",
                "proof_id": proof_id,
                "error": format!("Failed to start proof generation: {}", e)
            });
            let _ = state.tx.send(err_msg.to_string());
        }
    }
}

// --- Proof Verification ---

async fn verify_proof(state: AppState, proof_id: String, metadata: ProofMetadata) {
    info!("Starting proof verification for {}", proof_id);
    
    // Send status update
    let status_msg = json!({
        "type": "verification_status",
        "proof_id": proof_id,
        "status": "verifying",
        "message": "Verifying proof..."
    });
    let _ = state.tx.send(status_msg.to_string());
    
    let proof_dir = PathBuf::from(&state.proofs_dir).join(&proof_id);
    let proof_path = proof_dir.join("proof.bin");
    let public_path = proof_dir.join("public.json");
    
    // Check if proof files exist
    if !proof_path.exists() || !public_path.exists() {
        error!("Proof files not found for {}", proof_id);
        let err_msg = json!({
            "type": "verification_error",
            "proof_id": proof_id,
            "error": "Proof files not found. Make sure the proof ID is correct."
        });
        let _ = state.tx.send(err_msg.to_string());
        return;
    }
    
    // Build verification command
    let mut cmd = Command::new(&state.zkengine_binary);
    cmd.arg("verify")
        .arg("--step").arg(metadata.step_size.to_string())
        .arg(&proof_path)
        .arg(&public_path);
    
    cmd.stdout(Stdio::piped())
        .stderr(Stdio::piped());
    
    match cmd.spawn() {
        Ok(child) => {
            match child.wait_with_output().await {
                Ok(output) => {
                    if output.status.success() {
                        info!("Proof verified successfully for {}", proof_id);
                        
                        // Create .verified marker file
                        std::fs::write(proof_dir.join(".verified"), "").ok();
                        
                        let success_msg = json!({
                            "type": "verification_complete",
                            "proof_id": proof_id,
                            "status": "verified",
                            "result": "VALID"
                        });
                        let _ = state.tx.send(success_msg.to_string());
                        
                        // If this is an automated transfer, proceed to execution
                        if let Some(ref context) = metadata.additional_context {
                            if context.get("is_automated_transfer").and_then(|v| v.as_bool()).unwrap_or(false) {
                                tokio::spawn(execute_transfer(state.clone(), proof_id, context.clone()));
                            }
                        }
                    } else {
                        let err_msg = json!({
                            "type": "verification_complete",
                            "proof_id": proof_id,
                            "status": "invalid",
                            "result": "INVALID"
                        });
                        let _ = state.tx.send(err_msg.to_string());
                    }
                }
                Err(e) => {
                    error!("Failed to execute verification: {}", e);
                    let err_msg = json!({
                        "type": "verification_error",
                        "proof_id": proof_id,
                        "error": format!("Verification failed: {}", e)
                    });
                    let _ = state.tx.send(err_msg.to_string());
                }
            }
        }
        Err(e) => {
            error!("Failed to spawn verification process: {}", e);
            let err_msg = json!({
                "type": "verification_error",
                "proof_id": proof_id,
                "error": format!("Failed to start verification: {}", e)
            });
            let _ = state.tx.send(err_msg.to_string());
        }
    }
}

// --- List Proofs ---

async fn list_proofs(state: AppState, metadata: ProofMetadata) {
    info!("Listing proofs");
    
    let list_type = metadata.arguments.get(0)
        .map(|s| s.as_str())
        .unwrap_or("proofs");
    
    let proofs_dir = PathBuf::from(&state.proofs_dir);
    
    let mut proofs = Vec::new();
    
    // Read all proof directories
    if let Ok(entries) = std::fs::read_dir(&proofs_dir) {
        for entry in entries.flatten() {
            if let Ok(file_name) = entry.file_name().into_string() {
                if file_name.starts_with("proof_") {
                    let proof_path = entry.path();
                    
                    // Check if this is a valid proof directory
                    if proof_path.join("proof.bin").exists() {
                        // Get creation time
                        let timestamp = entry.metadata()
                            .ok()
                            .and_then(|m| m.created().ok())
                            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|d| d.as_secs())
                            .unwrap_or(0);
                        
                        let verified = proof_path.join(".verified").exists();
                        
                        // Try to read metadata file to get function name
                        let function = if let Ok(metadata_content) = std::fs::read_to_string(proof_path.join("metadata.json")) {
                            if let Ok(metadata_json) = serde_json::from_str::<serde_json::Value>(&metadata_content) {
                                metadata_json.get("function")
                                    .and_then(|f| f.as_str())
                                    .unwrap_or("unknown")
                                    .to_string()
                            } else {
                                // Fallback to inferring from filename
                                infer_function_from_filename(&file_name)
                            }
                        } else {
                            // Fallback to inferring from filename
                            infer_function_from_filename(&file_name)
                        };
                        
                        // Only include if it matches the filter
                        if list_type == "verifications" && !verified {
                            continue;
                        }
                        
                        proofs.push(json!({
                            "proof_id": file_name,
                            "timestamp": timestamp,
                            "verified": verified,
                            "function": function
                        }));
                    }
                }
            }
        }
    }
    
    // Sort by timestamp (newest first)
    proofs.sort_by(|a, b| {
        let ts_a = a.get("timestamp").and_then(|v| v.as_u64()).unwrap_or(0);
        let ts_b = b.get("timestamp").and_then(|v| v.as_u64()).unwrap_or(0);
        ts_b.cmp(&ts_a)
    });
    
    // Limit to 20 most recent
    proofs.truncate(20);
    
    let response_msg = json!({
        "type": "list_response",
        "list_type": list_type,
        "proofs": proofs,
        "count": proofs.len()
    });
    
    let _ = state.tx.send(response_msg.to_string());
}

// Helper function to infer function from filename
fn infer_function_from_filename(filename: &str) -> String {
    if filename.contains("kyc") {
        "prove_kyc".to_string()
    } else if filename.contains("location") {
        "prove_location".to_string()
    } else if filename.contains("ai") {
        "prove_ai_content".to_string()
    } else if filename.contains("custom") {
        "prove_custom".to_string()
    } else {
        "unknown".to_string()
    }
}

// --- Transfer Execution ---

async fn execute_transfer(state: AppState, proof_id: String, context: serde_json::Value) {
    info!("Executing transfer for proof {}", proof_id);
    
    // Send status update
    let status_msg = json!({
        "type": "transfer_status",
        "proof_id": proof_id,
        "status": "executing",
        "message": "Executing USDC transfer..."
    });
    let _ = state.tx.send(status_msg.to_string());
    
    // Call the Python service to execute the transfer
    let client = reqwest::Client::new();
    let res = client
        .post(&format!("{}/execute_verified_transfer", state.langchain_url))
        .json(&context)
        .send()
        .await;
    
    match res {
        Ok(response) => {
            if let Ok(transfer_result) = response.json::<serde_json::Value>().await {
                let success = transfer_result.get("success")
                    .and_then(|s| s.as_bool())
                    .unwrap_or(false);
                
                if success {
                    let complete_msg = json!({
                        "type": "transfer_complete",
                        "proof_id": proof_id,
                        "status": "complete",
                        "result": transfer_result
                    });
                    let _ = state.tx.send(complete_msg.to_string());
                } else {
                    let err_msg = json!({
                        "type": "transfer_error",
                        "proof_id": proof_id,
                        "error": transfer_result.get("detail").and_then(|d| d.as_str()).unwrap_or("Transfer failed")
                    });
                    let _ = state.tx.send(err_msg.to_string());
                }
            }
        }
        Err(e) => {
            error!("Failed to execute transfer: {}", e);
            let err_msg = json!({
                "type": "transfer_error",
                "proof_id": proof_id,
                "error": format!("Failed to execute transfer: {}", e)
            });
            let _ = state.tx.send(err_msg.to_string());
        }
    }
}
