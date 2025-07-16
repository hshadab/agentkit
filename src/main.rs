use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade, Json, Path,
    },
    response::{IntoResponse, Html},
    routing::{get, post},
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

mod nova_groth16_converter;
use nova_groth16_converter::convert_nova_to_groth16;
mod nova_to_groth16_truly_integrated;
use nova_to_groth16_truly_integrated::convert_nova_to_groth16_truly_integrated as convert_integrated;

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
    let langchain_url = std::env::var("CHAT_SERVICE_URL")
        .or_else(|_| std::env::var("LANGCHAIN_SERVICE_URL"))  // Fallback for compatibility
        .unwrap_or_else(|_| "http://localhost:8002".to_string());
    let zkengine_binary = std::env::var("ZKENGINE_BINARY")
        .unwrap_or_else(|_| "./zkengine_binary/zkEngine".to_string());
    let proofs_dir = std::env::var("PROOFS_DIR")
        .unwrap_or_else(|_| "./proofs".to_string());
    let wasm_dir = std::env::var("WASM_DIR")
        .unwrap_or_else(|_| "./zkengine_binary".to_string());
    
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
        .route("/workflow_update", post(workflow_update_handler))
        .route("/api/proofs", get(get_proofs))
        .route("/api/proof/:proof_id/ethereum", get(export_proof_ethereum))
        .route("/api/proof/:proof_id/ethereum-integrated", get(export_proof_ethereum_integrated))
        .route("/api/proof/:proof_id/solana", get(export_proof_solana))
        .route("/api/proof/:proof_id/update-verification", post(update_proof_verification))
        .nest_service("/static", tower_http::services::ServeDir::new("static"))
        .with_state(state);


    let addr = SocketAddr::from(([0, 0, 0, 0], 8001));
    info!("🚀 Server listening on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

// --- Workflow Update Handler ---

async fn workflow_update_handler(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    // Forward the workflow update to all connected WebSocket clients
    if state.tx.send(payload.to_string()).is_err() {
        error!("Failed to broadcast workflow update");
        return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to broadcast");
    }
    
    (StatusCode::OK, "Update sent")
}

// --- Get Proofs List ---

async fn get_proofs(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let proofs_db_path = PathBuf::from("proofs_db.json");
    
    if let Ok(content) = std::fs::read_to_string(&proofs_db_path) {
        if let Ok(db) = serde_json::from_str::<serde_json::Value>(&content) {
            let proofs: Vec<serde_json::Value> = db.as_object()
                .map(|obj| {
                    obj.iter()
                        .filter_map(|(id, proof)| {
                            let mut proof = proof.clone();
                            if let Some(obj) = proof.as_object_mut() {
                                // Add the ID field
                                obj.insert("id".to_string(), json!(id));
                                
                                // Extract function from metadata if not at top level
                                if let Some(metadata) = obj.get("metadata") {
                                    if let Some(function) = metadata.get("function") {
                                        obj.insert("function".to_string(), function.clone());
                                    }
                                }
                            }
                            Some(proof)
                        })
                        .collect()
                })
                .unwrap_or_default();
            
            return (StatusCode::OK, Json(json!({ "proofs": proofs })));
        }
    }
    
    // Fallback to empty list
    (StatusCode::OK, Json(json!({ "proofs": [] })))
}

// --- Update Proof Verification Data ---

async fn update_proof_verification(
    Path(proof_id): Path<String>,
    State(state): State<AppState>,
    Json(verification_data): Json<serde_json::Value>,
) -> impl IntoResponse {
    info!("Updating verification data for proof {}", proof_id);
    
    let proof_dir = PathBuf::from(&state.proofs_dir).join(&proof_id);
    let metadata_path = proof_dir.join("metadata.json");
    
    // Check if proof exists
    if !proof_dir.exists() {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": "Proof not found",
                "proof_id": proof_id
            }))
        );
    }
    
    // Read existing metadata
    let mut metadata = if let Ok(content) = std::fs::read_to_string(&metadata_path) {
        serde_json::from_str::<serde_json::Value>(&content).unwrap_or(json!({}))
    } else {
        json!({})
    };
    
    // Update with on-chain verification data
    metadata["on_chain_verifications"] = verification_data;
    
    // Write updated metadata back
    match std::fs::write(&metadata_path, serde_json::to_string_pretty(&metadata).unwrap()) {
        Ok(_) => {
            info!("Successfully updated verification data for {}", proof_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "proof_id": proof_id
            })))
        }
        Err(e) => {
            error!("Failed to update verification data: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "Failed to update verification data",
                    "details": e.to_string()
                }))
            )
        }
    }
}

// --- Export Proof for Ethereum ---

async fn export_proof_ethereum(
    Path(proof_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    info!("Exporting proof {} for Ethereum verification", proof_id);
    
    // Try multiple directory naming patterns
    let mut proof_dir = PathBuf::from(&state.proofs_dir).join(&proof_id);
    
    // If directory doesn't exist, try alternative naming patterns
    if !proof_dir.exists() {
        // Try replacing "proof_" with "prove_"
        if proof_id.starts_with("proof_") {
            let alt_id = proof_id.replacen("proof_", "prove_", 1);
            let alt_dir = PathBuf::from(&state.proofs_dir).join(&alt_id);
            if alt_dir.exists() {
                info!("Using alternative proof directory: {} -> {}", proof_id, alt_id);
                proof_dir = alt_dir;
            }
        }
        // Try replacing "prove_" with "proof_"
        else if proof_id.starts_with("prove_") {
            let alt_id = proof_id.replacen("prove_", "proof_", 1);
            let alt_dir = PathBuf::from(&state.proofs_dir).join(&alt_id);
            if alt_dir.exists() {
                info!("Using alternative proof directory: {} -> {}", proof_id, alt_id);
                proof_dir = alt_dir;
            }
        }
    }
    
    // Check if proof exists
    if !proof_dir.exists() {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": "Proof not found",
                "proof_id": proof_id
            }))
        );
    }
    
    // Read public inputs
    let public_json_path = proof_dir.join("public.json");
    let _public_json = match std::fs::read_to_string(&public_json_path) {
        Ok(content) => content,
        Err(e) => {
            error!("Failed to read public.json: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "Failed to read public inputs",
                    "details": e.to_string()
                }))
            );
        }
    };
    
    // Read metadata
    let metadata_path = proof_dir.join("metadata.json");
    let _metadata = match std::fs::read_to_string(&metadata_path) {
        Ok(content) => content,
        Err(_) => "{}".to_string(), // Default empty metadata
    };
    
    // Convert Nova proof to Groth16 format
    match convert_nova_to_groth16(&proof_dir, &proof_id) {
        Ok(ethereum_data) => {
            (StatusCode::OK, Json(serde_json::to_value(ethereum_data).unwrap()))
        }
        Err(e) => {
            error!("Failed to convert proof: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "Failed to convert proof",
                    "details": e.to_string()
                }))
            )
        }
    }
}

// Test handler for integrated Nova to Groth16 conversion
async fn export_proof_ethereum_integrated(
    Path(proof_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    info!("Testing integrated conversion for proof {}", proof_id);
    
    // Try multiple directory naming patterns
    let mut proof_dir = PathBuf::from(&state.proofs_dir).join(&proof_id);
    
    // If directory doesn't exist, try alternative naming patterns
    if !proof_dir.exists() {
        // Try replacing "proof_" with "prove_"
        if proof_id.starts_with("proof_") {
            let alt_id = proof_id.replacen("proof_", "prove_", 1);
            let alt_dir = PathBuf::from(&state.proofs_dir).join(&alt_id);
            if alt_dir.exists() {
                info!("Using alternative proof directory: {} -> {}", proof_id, alt_id);
                proof_dir = alt_dir;
            }
        }
        // Try replacing "prove_" with "proof_"
        else if proof_id.starts_with("prove_") {
            let alt_id = proof_id.replacen("prove_", "proof_", 1);
            let alt_dir = PathBuf::from(&state.proofs_dir).join(&alt_id);
            if alt_dir.exists() {
                info!("Using alternative proof directory: {} -> {}", proof_id, alt_id);
                proof_dir = alt_dir;
            }
        }
    }
    
    // Check if proof exists
    if !proof_dir.exists() {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": "Proof not found",
                "proof_id": proof_id
            }))
        );
    }
    
    // Test integrated conversion
    match convert_integrated(&proof_dir, &proof_id).await {
        Ok(ethereum_data) => {
            (StatusCode::OK, Json(serde_json::to_value(ethereum_data).unwrap()))
        }
        Err(e) => {
            error!("Failed to convert proof (integrated): {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "Failed to convert proof",
                    "details": e.to_string()
                }))
            )
        }
    }
}

// Export proof for Solana verification
async fn export_proof_solana(
    Path(proof_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    info!("Exporting proof {} for Solana verification", proof_id);
    
    // Try multiple directory naming patterns
    let mut proof_dir = PathBuf::from(&state.proofs_dir).join(&proof_id);
    
    // If directory doesn't exist, try alternative naming patterns
    if !proof_dir.exists() {
        // Try replacing "proof_" with "prove_"
        if proof_id.starts_with("proof_") {
            let alt_id = proof_id.replacen("proof_", "prove_", 1);
            let alt_dir = PathBuf::from(&state.proofs_dir).join(&alt_id);
            if alt_dir.exists() {
                info!("Using alternative proof directory: {} -> {}", proof_id, alt_id);
                proof_dir = alt_dir;
            }
        }
        // Try replacing "prove_" with "proof_"
        else if proof_id.starts_with("prove_") {
            let alt_id = proof_id.replacen("prove_", "proof_", 1);
            let alt_dir = PathBuf::from(&state.proofs_dir).join(&alt_id);
            if alt_dir.exists() {
                info!("Using alternative proof directory: {} -> {}", proof_id, alt_id);
                proof_dir = alt_dir;
            }
        }
    }
    
    // Check if proof exists
    if !proof_dir.exists() {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": "Proof not found",
                "proof_id": proof_id
            }))
        );
    }
    
    // Read metadata to get proof type
    let metadata_path = proof_dir.join("metadata.json");
    let metadata: serde_json::Value = match std::fs::read_to_string(&metadata_path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or(json!({})),
        Err(_) => json!({})
    };
    
    // Read public inputs to get commitment
    let public_json_path = proof_dir.join("public.json");
    let public_inputs: serde_json::Value = match std::fs::read_to_string(&public_json_path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or(json!({})),
        Err(e) => {
            error!("Failed to read public.json: {}", e);
            json!({})
        }
    };
    
    // Extract commitment from public inputs - use IC_i (Instance Commitment input)
    // This is the Poseidon hash commitment from the zkEngine proof
    let ic_i = public_inputs.get("IC_i")
        .and_then(|c| c.as_str())
        .unwrap_or("0000000000000000000000000000000000000000000000000000000000000000");
    
    // Create a unique commitment by hashing IC_i with proof_id
    // This ensures each proof has a unique commitment even with same inputs
    use sha2::{Sha256, Digest};
    let mut commitment_hasher = Sha256::new();
    commitment_hasher.update(ic_i.as_bytes());
    commitment_hasher.update(proof_id.as_bytes());
    let commitment_hash = commitment_hasher.finalize();
    let commitment = format!("0x{}", hex::encode(&commitment_hash));
    
    // Get proof type from metadata
    let proof_type = metadata.get("function")
        .and_then(|f| f.as_str())
        .unwrap_or("unknown");
    
    // Convert proof_id to bytes32 format - create a proper hex hash
    // (Already imported sha2 above)
    let mut hasher = Sha256::new();
    hasher.update(proof_id.as_bytes());
    let hash_result = hasher.finalize();
    let proof_id_bytes32 = format!("0x{}", hex::encode(&hash_result));
    
    // Return proof data with commitment for Solana verification
    (StatusCode::OK, Json(json!({
        "proof_id": proof_id,
        "proof_id_bytes32": proof_id_bytes32,
        "commitment": commitment,
        "proof_type": proof_type,
        "public_inputs": public_inputs,
        "metadata": metadata,
        "timestamp": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        "status": "ready_for_verification"
    })))
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

// --- FIXED Command Processing ---

async fn process_user_command(state: AppState, message: String) {
    let payload: serde_json::Value = match serde_json::from_str(&message) {
        Ok(val) => val,
        Err(_) => {
            error!("Failed to parse incoming message as JSON: {}", message);
            return;
        }
    };

    // Check message type
    if let Some(msg_type) = payload.get("type").and_then(|t| t.as_str()) {
        // Handle poll_workflow message type
        if msg_type == "poll_workflow" {
            // Simply ignore workflow polling messages - they're handled by workflow updates
            let workflow_id = payload.get("workflowId").and_then(|w| w.as_str()).unwrap_or("unknown");
            info!("Ignoring poll_workflow for {}", workflow_id);
            return;
        }
        
        if msg_type == "execute_workflow" {
            // Handle workflow execution request
            if let Some(command) = payload.get("command").and_then(|c| c.as_str()) {
                let timestamp = chrono::Local::now();
                info!("[WORKFLOW_REQUEST_RUST] Time: {}", timestamp.format("%Y-%m-%d %H:%M:%S%.3f"));
                info!("[WORKFLOW_REQUEST_RUST] Received execute_workflow: {}", command);
                
                // Forward to Python's execute_workflow endpoint
                let client = reqwest::Client::new();
                let workflow_request = json!({
                    "command": command
                });
                
                let res = client
                    .post(&format!("{}/execute_workflow", state.langchain_url))
                    .json(&workflow_request)
                    .send()
                    .await;
                
                match res {
                    Ok(response) => {
                        if let Ok(workflow_response) = response.json::<serde_json::Value>().await {
                            info!("Workflow response: {:?}", workflow_response);
                            
                            // Just forward the response - Python service handles workflow updates
                            if workflow_response.get("success").and_then(|s| s.as_bool()).unwrap_or(false) {
                                info!("Workflow executed successfully");
                                
                                // Send workflow complete with transfer IDs for polling
                                if let Some(transfer_ids) = workflow_response.get("transferIds").and_then(|t| t.as_array()) {
                                    for transfer_id in transfer_ids {
                                        if let Some(id_str) = transfer_id.as_str() {
                                            // Start polling for this transfer
                                            info!("Transfer initiated: {}", id_str);
                                        }
                                    }
                                }
                            } else {
                                error!("Workflow execution failed");
                            }
                        }
                    }
                    Err(e) => {
                        error!("Failed to execute workflow: {}", e);
                        let err_msg = json!({
                            "type": "error",
                            "message": format!("Failed to execute workflow: {}", e)
                        }).to_string();
                        let _ = state.tx.send(err_msg);
                    }
                }
            }
            return;
        }
        
        if msg_type == "poll_transfer" {
            // Handle transfer polling request
            if let (Some(transfer_id), Some(blockchain)) = (
                payload.get("transferId").and_then(|t| t.as_str()),
                payload.get("blockchain").and_then(|b| b.as_str())
            ) {
                info!("Polling transfer status: {} on {}", transfer_id, blockchain);
                
                // Call the Python service to check transfer status
                let client = reqwest::Client::new();
                let poll_request = json!({
                    "transferId": transfer_id,
                    "blockchain": blockchain
                });
                
                let res = client
                    .post(&format!("{}/poll_transfer", state.langchain_url))
                    .json(&poll_request)
                    .send()
                    .await;
                
                match res {
                    Ok(response) => {
                        if let Ok(transfer_data) = response.json::<serde_json::Value>().await {
                            // Send transfer update to UI
                            let update_msg = json!({
                                "type": "transfer_update",
                                "transferId": transfer_id,
                                "status": transfer_data.get("status").and_then(|s| s.as_str()).unwrap_or("pending"),
                                "transactionHash": transfer_data.get("transactionHash"),
                                "explorerLink": transfer_data.get("explorerLink"),
                                "blockchain": blockchain
                            });
                            
                            if state.tx.send(update_msg.to_string()).is_err() {
                                error!("Failed to send transfer update");
                            }
                        }
                    }
                    Err(e) => {
                        error!("Failed to poll transfer: {}", e);
                    }
                }
            }
            return;
        }
        
        // Handle workflow update messages (from executor)
        if msg_type == "workflow_started" || msg_type == "workflow_step_update" || msg_type == "workflow_completed" {
            info!("Broadcasting workflow update: {}", msg_type);
            
            // Log workflow_completed details to debug the "Hello!" loop
            if msg_type == "workflow_completed" {
                info!("Workflow completed - full payload: {:?}", payload);
                if let Some(workflow_id) = payload.get("workflowId") {
                    info!("Completed workflow ID: {:?}", workflow_id);
                }
            }
            
            // Broadcast the workflow update to all connected clients
            if state.tx.send(message.clone()).is_err() {
                error!("Failed to broadcast workflow update");
            }
            return;
        }
        
        // Handle blockchain verification messages
        if msg_type == "blockchain_verification_request" || msg_type == "blockchain_verification_response" || msg_type == "blockchain_verification_update" {
            info!("Broadcasting blockchain verification message: {}", msg_type);
            
            // Log details for debugging
            if let Some(proof_id) = payload.get("proofId") {
                info!("Blockchain verification for proof: {:?}", proof_id);
            }
            if let Some(blockchain) = payload.get("blockchain") {
                info!("Blockchain: {:?}", blockchain);
            }
            
            // Broadcast to all connected clients
            if state.tx.send(message.clone()).is_err() {
                error!("Failed to broadcast blockchain verification message");
            }
            return;
        }
    }

    // CHECK IF MESSAGE ALREADY HAS METADATA (from frontend)
    if let Some(metadata_value) = payload.get("metadata") {
        info!("Message already contains metadata - processing directly without Python call");
        
        // Extract proof_id
        let proof_id = payload.get("proof_id")
            .and_then(|p| p.as_str())
            .unwrap_or(&Uuid::new_v4().to_string())
            .to_string();
        
        // Parse metadata
        if let Ok(metadata) = serde_json::from_value::<ProofMetadata>(metadata_value.clone()) {
            // Check if this is a verification request by function name
            if metadata.function == "verify_proof" {
                info!("Processing verification request for function: verify_proof");
                if let Some(proof_id_arg) = metadata.arguments.get(0) {
                    let proof_id = proof_id_arg.trim().to_string();
                    info!("Verifying proof: {}", proof_id);
                    // Preserve the original payload's additional context
                    let mut verify_metadata = metadata.clone();
                    if let Some(original_context) = payload.get("additional_context") {
                        verify_metadata.additional_context = Some(original_context.clone());
                    } else if let Some(workflow_id) = payload.get("workflowId") {
                        verify_metadata.additional_context = Some(serde_json::json!({
                            "workflow_id": workflow_id,
                            "step_index": 1
                        }));
                    }
                    tokio::spawn(verify_proof(state.clone(), proof_id, verify_metadata));
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
            if let Some(context) = &metadata.additional_context {
                if context.get("is_verification").and_then(|v| v.as_bool()).unwrap_or(false) {
                    info!("Processing verification for {}", proof_id);
                    // Preserve the original payload's additional context
                    let mut verify_metadata = metadata.clone();
                    if let Some(original_context) = payload.get("additional_context") {
                        verify_metadata.additional_context = Some(original_context.clone());
                    } else if let Some(workflow_id) = payload.get("workflowId") {
                        verify_metadata.additional_context = Some(serde_json::json!({
                            "workflow_id": workflow_id,
                            "step_index": 1
                        }));
                    }
                    tokio::spawn(verify_proof(state.clone(), proof_id, verify_metadata));
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
            info!("Processing proof generation for {}", proof_id);
            tokio::spawn(generate_proof(state.clone(), proof_id, metadata));
        }
        return; // Exit early - no Python call needed
    }

    // OTHERWISE, make Python call (for messages without metadata)
    // Extract the actual message content from the payload
    let message_content = payload.get("content")
        .and_then(|c| c.as_str())
        .unwrap_or_else(|| {
            // Fallback: if no content field, try to use the whole payload as string
            payload.as_str().unwrap_or("")
        });
    
    // Log all queries for debugging duplicate workflows
    let timestamp = chrono::Local::now();
    info!("[QUERY_REQUEST_RUST] Time: {}", timestamp.format("%Y-%m-%d %H:%M:%S%.3f"));
    info!("[QUERY_REQUEST_RUST] Content: {}", message_content);
    
    // Skip empty messages to prevent loops
    if message_content.trim().is_empty() {
        info!("Skipping empty message - not forwarding to Python service");
        return;
    }
    
    // Log suspicious messages
    if message_content.to_lowercase() == "hello" || message_content.to_lowercase() == "hello!" {
        info!("WARNING: Detected 'Hello!' message being sent to Python service");
        info!("Full payload: {:?}", payload);
    }
    
    // Create the request body in the format Python expects
    let chat_request = json!({
        "message": message_content
    });
    
    let client = reqwest::Client::new();
    let res = client
        .post(&format!("{}/chat", state.langchain_url))
        .json(&chat_request)
        .send()
        .await;

    match res {
        Ok(response) => {
            if let Ok(chat_response) = response.json::<serde_json::Value>().await {
                info!("Chat response received: {:?}", chat_response);
                
                // Send the response to the UI
                let ui_message = json!({
                    "type": "chat_response",
                    "response": chat_response.get("response").and_then(|r| r.as_str()).unwrap_or(""),
                    "metadata": chat_response.get("metadata"),
                    "intent": chat_response.get("intent"),
                    "command": chat_response.get("command"),
                    "messageId": chat_response.get("messageId"),
                });
                
                if state.tx.send(ui_message.to_string()).is_err() {
                    error!("Failed to broadcast message to clients");
                }
                
                // Check if the intent contains proof metadata that needs processing
                if let Some(intent) = chat_response.get("intent") {
                    // Check if intent is an object (proof metadata) vs a string (workflow/openai_chat)
                    if intent.is_object() {
                        // This is proof metadata - process it
                        if let Ok(metadata) = serde_json::from_value::<ProofMetadata>(intent.clone()) {
                            let proof_id = chat_response.get("metadata")
                                .and_then(|m| m.get("proof_id"))
                                .and_then(|p| p.as_str())
                                .unwrap_or(&Uuid::new_v4().to_string())
                                .to_string();
                            
                            info!("Processing standalone proof command: {} with proof_id: {}", metadata.function, proof_id);
                            
                            // Check if this is a verification request
                            if metadata.function == "verify_proof" {
                                if let Some(proof_id_arg) = metadata.arguments.get(0) {
                                    let verify_proof_id = proof_id_arg.trim().to_string();
                                    info!("Verifying proof: {}", verify_proof_id);
                                    tokio::spawn(verify_proof(state.clone(), verify_proof_id, metadata));
                                }
                            } else if metadata.function == "list_proofs" {
                                info!("Processing list proofs request");
                                tokio::spawn(list_proofs(state.clone(), metadata));
                            } else {
                                // Generate a new proof
                                info!("Generating proof for standalone command");
                                tokio::spawn(generate_proof(state.clone(), proof_id, metadata));
                            }
                        }
                    } else if let Some(intent_str) = intent.as_str() {
                        // Handle workflow intent
                        if intent_str == "workflow" {
                            if let Some(command) = chat_response.get("command").and_then(|c| c.as_str()) {
                                info!("Executing workflow directly from chat response: {}", command);
                                
                                // Execute the workflow
                                let client = reqwest::Client::new();
                                let workflow_request = json!({
                                    "command": command
                                });
                                
                                let state_clone = state.clone();
                                
                                tokio::spawn(async move {
                                    match client
                                        .post(&format!("{}/execute_workflow", state_clone.langchain_url))
                                        .json(&workflow_request)
                                        .send()
                                        .await
                                    {
                                        Ok(response) => {
                                            if let Ok(workflow_response) = response.json::<serde_json::Value>().await {
                                                info!("Workflow execution initiated: {:?}", workflow_response);
                                            }
                                        }
                                        Err(e) => {
                                            error!("Failed to execute workflow: {}", e);
                                        }
                                    }
                                });
                            }
                        }
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

// Helper function to update proofs database
fn update_proofs_db(proof_id: &str, metadata: &ProofMetadata, metrics: serde_json::Value, status: &str) -> Result<(), Box<dyn std::error::Error>> {
    let db_path = PathBuf::from("./proofs_db.json");
    
    // Read existing database or create new one
    let mut db: serde_json::Map<String, serde_json::Value> = if db_path.exists() {
        let content = std::fs::read_to_string(&db_path)?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        serde_json::Map::new()
    };
    
    // Create proof entry
    let proof_entry = json!({
        "id": proof_id,
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "metadata": metadata,
        "metrics": metrics,
        "status": status,
        "file_path": format!("./proofs/{}/proof.bin", proof_id)
    });
    
    // Add or update entry
    db.insert(proof_id.to_string(), proof_entry);
    
    // Write back to file
    let json_string = serde_json::to_string_pretty(&db)?;
    std::fs::write(&db_path, json_string)?;
    
    Ok(())
}

// --- FIXED Proof Generation with Correct WASM Files ---

async fn generate_proof(state: AppState, proof_id: String, metadata: ProofMetadata) {
    info!("Starting proof generation for {}", proof_id);
    
    // Send status update with workflow context
    let status_msg = json!({
        "type": "proof_status",
        "proof_id": proof_id,
        "status": "generating",
        "message": "Generating proof...",
        "metadata": &metadata,
        "workflowId": metadata.additional_context.as_ref()
            .and_then(|ctx| ctx.get("workflow_id"))
            .and_then(|id| id.as_str()),
        "additional_context": metadata.additional_context.clone()
    });
    let _ = state.tx.send(status_msg.to_string());
    
    // FIXED: Use real WASM files with actual implementations
    let wasm_file = match metadata.function.as_str() {
        "prove_kyc" => "kyc_compliance_real.wasm",
        "prove_ai_content" => "ai_content_verification_real.wasm",
        "prove_location" => "depin_location_real.wasm",
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
        let err_msg = json!({
            "type": "proof_error",
            "proof_id": proof_id,
            "error": format!("Failed to create proof directory: {}", e)
        });
        let _ = state.tx.send(err_msg.to_string());
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
    
    info!("Executing zkEngine command: {:?}", cmd);
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
                        
                        // Update metadata with generation time
                        let metadata_path = proof_dir.join("metadata.json");
                        if let Ok(mut metadata_content) = std::fs::read_to_string(&metadata_path) {
                            if let Ok(mut metadata_json) = serde_json::from_str::<serde_json::Value>(&metadata_content) {
                                metadata_json["time_ms"] = json!(duration.as_millis());
                                metadata_json["proof_size"] = json!(proof_size);
                                // Write updated metadata back
                                if let Ok(updated_metadata) = serde_json::to_string_pretty(&metadata_json) {
                                    let _ = std::fs::write(&metadata_path, updated_metadata);
                                }
                            }
                        }
                        
                        // Update proofs database
                        let metrics = json!({
                            "time_ms": duration.as_millis(),
                            "proof_size": proof_size,
                            "generation_time_secs": duration.as_secs_f64()
                        });
                        
                        if let Err(e) = update_proofs_db(&proof_id, &metadata, metrics.clone(), "complete") {
                            error!("Failed to update proofs database: {}", e);
                        }
                        
                        let success_msg = json!({
                            "type": "proof_complete",
                            "proof_id": proof_id,
                            "status": "complete",
                            "metrics": metrics,
                            "metadata": &metadata,
                            "workflowId": metadata.additional_context.as_ref()
                                .and_then(|ctx| ctx.get("workflow_id"))
                                .and_then(|id| id.as_str()),
                            "additional_context": metadata.additional_context.clone()
                        });
                        let _ = state.tx.send(success_msg.to_string());
                        
                    } else {
                        error!("Proof generation failed: {}", String::from_utf8_lossy(&output.stderr));
                        
                        // Update proofs database with failure
                        let metrics = json!({
                            "time_ms": duration.as_millis(),
                            "generation_time_secs": duration.as_secs_f64(),
                            "error": String::from_utf8_lossy(&output.stderr).to_string()
                        });
                        
                        if let Err(e) = update_proofs_db(&proof_id, &metadata, metrics, "failed") {
                            error!("Failed to update proofs database: {}", e);
                        }
                        
                        let err_msg = json!({
                            "type": "proof_error",
                            "proof_id": proof_id,
                            "error": format!("Proof generation failed: {}", String::from_utf8_lossy(&output.stderr))
                        });
                        let _ = state.tx.send(err_msg.to_string());
                    }
                }
                Err(e) => {
                    error!("Failed to wait for zkEngine: {}", e);
                    let err_msg = json!({
                        "type": "proof_error",
                        "proof_id": proof_id,
                        "error": format!("Failed to wait for zkEngine: {}", e)
                    });
                    let _ = state.tx.send(err_msg.to_string());
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
    
    // Send status update with workflow context
    let status_msg = json!({
        "type": "verification_status",
        "proof_id": proof_id,
        "status": "verifying",
        "message": "Verifying proof...",
        "metadata": &metadata,
        "workflowId": metadata.additional_context.as_ref()
            .and_then(|ctx| ctx.get("workflow_id"))
            .and_then(|id| id.as_str()),
        "additional_context": metadata.additional_context.clone()
    });
    let _ = state.tx.send(status_msg.to_string());
    
    // Try multiple directory naming patterns
    let mut proof_dir = PathBuf::from(&state.proofs_dir).join(&proof_id);
    
    // If directory doesn't exist, try alternative naming patterns
    if !proof_dir.exists() {
        // Try replacing "proof_" with "prove_"
        if proof_id.starts_with("proof_") {
            let alt_id = proof_id.replacen("proof_", "prove_", 1);
            let alt_dir = PathBuf::from(&state.proofs_dir).join(&alt_id);
            if alt_dir.exists() {
                info!("Using alternative proof directory: {} -> {}", proof_id, alt_id);
                proof_dir = alt_dir;
            }
        }
        // Try replacing "prove_" with "proof_"
        else if proof_id.starts_with("prove_") {
            let alt_id = proof_id.replacen("prove_", "proof_", 1);
            let alt_dir = PathBuf::from(&state.proofs_dir).join(&alt_id);
            if alt_dir.exists() {
                info!("Using alternative proof directory: {} -> {}", proof_id, alt_id);
                proof_dir = alt_dir;
            }
        }
    }
    
    let proof_path = proof_dir.join("proof.bin");
    let public_path = proof_dir.join("public.json");
    
    // Check for cached verification result
    let verified_marker = proof_dir.join(".verified");
    if verified_marker.exists() {
        info!("Using cached verification for {} (already verified)", proof_id);
        
        let success_msg = json!({
            "type": "verification_complete",
            "proof_id": proof_id,
            "status": "verified",
            "result": "VALID",
            "cached": true,
            "metadata": &metadata,
            "workflowId": metadata.additional_context.as_ref()
                .and_then(|ctx| ctx.get("workflow_id"))
                .and_then(|id| id.as_str()),
            "additional_context": metadata.additional_context.clone()
        });
        let _ = state.tx.send(success_msg.to_string());
        return;
    }
    
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
                            "result": "VALID",
                            "metadata": &metadata,
                            "workflowId": metadata.additional_context.as_ref()
                                .and_then(|ctx| ctx.get("workflow_id"))
                                .and_then(|id| id.as_str()),
                            "additional_context": metadata.additional_context.clone()
                        });
                        let _ = state.tx.send(success_msg.to_string());
                        
                    } else {
                        let err_msg = json!({
                            "type": "verification_complete",
                            "proof_id": proof_id,
                            "status": "invalid",
                            "result": "INVALID",
                            "metadata": &metadata,
                            "workflowId": metadata.additional_context.as_ref()
                                .and_then(|ctx| ctx.get("workflow_id"))
                                .and_then(|id| id.as_str()),
                            "additional_context": metadata.additional_context.clone()
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
    let db_path = PathBuf::from("./proofs_db.json");
    
    let mut proofs = Vec::new();
    let mut seen_ids = std::collections::HashSet::<String>::new();
    
    // First, read from proofs database
    if db_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&db_path) {
            if let Ok(db) = serde_json::from_str::<serde_json::Map<String, serde_json::Value>>(&content) {
                for (proof_id, entry) in db {
                    seen_ids.insert(proof_id.clone());
                    
                    // Extract relevant fields from database entry
                    let timestamp = entry.get("timestamp")
                        .and_then(|t| t.as_str())
                        .and_then(|t| chrono::DateTime::parse_from_rfc3339(t).ok())
                        .map(|t| t.timestamp() as u64)
                        .unwrap_or(0);
                    
                    let function = entry.get("metadata")
                        .and_then(|m| m.get("function"))
                        .and_then(|f| f.as_str())
                        .unwrap_or("unknown")
                        .to_string();
                    
                    let metrics = entry.get("metrics")
                        .cloned()
                        .unwrap_or(json!({}));
                    
                    let status = entry.get("status")
                        .and_then(|s| s.as_str())
                        .unwrap_or("unknown");
                    
                    // Check if proof file still exists
                    let mut proof_path = PathBuf::from(&state.proofs_dir).join(&proof_id);
                    
                    // If directory doesn't exist, try alternative naming patterns
                    if !proof_path.exists() {
                        if proof_id.starts_with("proof_") {
                            let alt_id = proof_id.replacen("proof_", "prove_", 1);
                            let alt_path = PathBuf::from(&state.proofs_dir).join(&alt_id);
                            if alt_path.exists() {
                                proof_path = alt_path;
                            }
                        } else if proof_id.starts_with("prove_") {
                            let alt_id = proof_id.replacen("prove_", "proof_", 1);
                            let alt_path = PathBuf::from(&state.proofs_dir).join(&alt_id);
                            if alt_path.exists() {
                                proof_path = alt_path;
                            }
                        }
                    }
                    
                    let exists = proof_path.join("proof.bin").exists();
                    let verified = proof_path.join(".verified").exists();
                    
                    // Check for on-chain verifications
                    let metadata_path = proof_path.join("metadata.json");
                    let on_chain_verifications = if let Ok(metadata_content) = std::fs::read_to_string(&metadata_path) {
                        if let Ok(metadata_json) = serde_json::from_str::<serde_json::Value>(&metadata_content) {
                            metadata_json.get("on_chain_verifications").cloned().unwrap_or(serde_json::Value::Null)
                        } else {
                            serde_json::Value::Null
                        }
                    } else {
                        serde_json::Value::Null
                    };
                    
                    // Only include if it matches the filter
                    if list_type == "verifications" && !verified && on_chain_verifications.is_null() {
                        continue;
                    }
                    
                    if exists && status == "complete" {
                        let mut proof_json = json!({
                            "proof_id": proof_id,
                            "timestamp": timestamp,
                            "verified": verified,
                            "function": function,
                            "metrics": metrics,
                            "from_db": true
                        });
                        
                        // Add on-chain verifications if available
                        if !on_chain_verifications.is_null() {
                            proof_json["on_chain_verifications"] = on_chain_verifications;
                        }
                        
                        proofs.push(proof_json);
                    }
                }
            }
        }
    }
    
    // Then read all proof directories not in database
    if let Ok(entries) = std::fs::read_dir(&proofs_dir) {
        for entry in entries.flatten() {
            if let Ok(file_name) = entry.file_name().into_string() {
                if file_name.starts_with("proof_") && !seen_ids.contains(&file_name) {
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
                        
                        // Try to read metadata file to get function name and verification data
                        let mut function = "unknown".to_string();
                        let mut on_chain_verifications = serde_json::Value::Null;
                        let mut time_ms: Option<u64> = None;
                        
                        if let Ok(metadata_content) = std::fs::read_to_string(proof_path.join("metadata.json")) {
                            if let Ok(metadata_json) = serde_json::from_str::<serde_json::Value>(&metadata_content) {
                                function = metadata_json.get("function")
                                    .and_then(|f| f.as_str())
                                    .unwrap_or("unknown")
                                    .to_string();
                                
                                // Get on-chain verification data if present
                                if let Some(verif_data) = metadata_json.get("on_chain_verifications") {
                                    on_chain_verifications = verif_data.clone();
                                }
                                
                                // Get time_ms if present
                                time_ms = metadata_json.get("time_ms")
                                    .and_then(|t| t.as_u64());
                            } else {
                                function = infer_function_from_filename(&file_name);
                            }
                        } else {
                            function = infer_function_from_filename(&file_name);
                        }
                        
                        // Get proof size
                        let proof_size = std::fs::metadata(proof_path.join("proof.bin"))
                            .map(|m| m.len())
                            .unwrap_or(0);
                        
                        // Only include if it matches the filter
                        if list_type == "verifications" && !verified && on_chain_verifications.is_null() {
                            continue;
                        }
                        
                        let mut proof_json = json!({
                            "proof_id": file_name,
                            "timestamp": timestamp,
                            "verified": verified,
                            "function": function,
                            "metrics": {
                                "proof_size": proof_size
                            }
                        });
                        
                        // Add time_ms if available
                        if let Some(time) = time_ms {
                            proof_json["metrics"]["time_ms"] = json!(time);
                        }
                        
                        // Add on-chain verifications if available
                        if !on_chain_verifications.is_null() {
                            proof_json["on_chain_verifications"] = on_chain_verifications;
                        }
                        
                        proofs.push(proof_json);
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
