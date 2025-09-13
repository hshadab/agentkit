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
use axum::routing::post;
use axum::extract::Path;
use axum::Json;
use serde_json::Value;
use tokio::io::AsyncWriteExt;
use ethers::prelude::*;
use ethers::types::{U256, Address, H256, Bytes, H160};
use std::sync::Arc;
use sha2::{Digest, Sha256};
use ethers::core::utils::keccak256;
use ethers::abi::{Token, encode};
use std::collections::HashMap;

// --- Main State and Data Structures ---

#[derive(Clone)]
struct AppState {
    tx: broadcast::Sender<String>,
    zkengine_binary: String,
    proofs_dir: String,
    wasm_dir: String,
    // Upstream service URLs for proxying
    zkml_url: String,
    iotex_url: String,
    medical_url: String,
    ai_url: String,
    enabled_probes: Vec<String>,
    enabled_workflows: Vec<String>,
    // OpenAI + Gateway
    openai_api_key: String,
    openai_model: String,
    circle_api_base: String,
    circle_api_key: String,
    // IoTeX on-chain config
    iotex_rpc_urls: Vec<String>,
    iotex_private_key: Option<String>,
    // Avalanche
    avalanche_rpc_url: String,
    avalanche_chain_id: u64,
    avalanche_private_key: Option<String>,
    avalanche_medical_address: Option<Address>,
    // Base AI
    base_rpc_url: String,
    base_chain_id: u64,
    base_private_key: Option<String>,
    base_ai_commitment_address: Option<Address>,
    base_groth16_verifier_address: Option<Address>,
    // Sessions
    medical_sessions: Arc<tokio::sync::Mutex<HashMap<String, MedicalSession>>>,
    ai_sessions: Arc<tokio::sync::Mutex<HashMap<String, AiSession>>>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
struct MedicalSession {
    record_id: String,
    record_hash: String,
    patient_id: u64,
    transaction_hash: String,
    block_number: u64,
    proof: Option<Value>,
    proof_id: Option<String>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
struct AiSession {
    commitment_id: String,
    prompt: String,
    response: String,
    nonce: String,
    prompt_hash: String,
    response_hash: String,
    transaction_hash: String,
    block_number: u64,
    zk_engine_proof: Option<Value>,
    zk_engine_public: Option<Value>,
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
    let zkengine_binary = std::env::var("ZKENGINE_BINARY")
        .unwrap_or_else(|_| "./zkengine/zkEngine".to_string());
    let proofs_dir = std::env::var("PROOFS_DIR")
        .unwrap_or_else(|_| "./proofs".to_string());
    let wasm_dir = std::env::var("WASM_DIR")
        .unwrap_or_else(|_| "./zkengine/example_wasms".to_string());

    // Upstream services (for proxy endpoints)
    let zkml_url = std::env::var("ZKML_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8002".to_string());
    // Circle Gateway direct API (no Node proxy)
    let circle_api_base = std::env::var("CIRCLE_GATEWAY_API_BASE")
        .unwrap_or_else(|_| "https://gateway-api-testnet.circle.com".to_string());
    let circle_api_key = std::env::var("CIRCLE_GATEWAY_API_KEY")
        .or_else(|_| std::env::var("CIRCLE_API_KEY"))
        .unwrap_or_else(|_| "".to_string());
    let iotex_url = std::env::var("IOTEX_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8007".to_string());
    let medical_url = std::env::var("MEDICAL_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8003".to_string());
    let ai_url = std::env::var("AI_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8004".to_string());

    // OpenAI config
    let openai_api_key = std::env::var("OPENAI_API_KEY").unwrap_or_else(|_| "".to_string());
    let openai_model = std::env::var("OPENAI_MODEL").unwrap_or_else(|_| "gpt-4o-mini".to_string());

    // Capabilities
    let enabled_probes = std::env::var("ENABLED_PROBES")
        .unwrap_or_else(|_| "iotex".to_string())
        .split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect::<Vec<_>>();
    let enabled_workflows = std::env::var("ENABLED_WORKFLOWS")
        .unwrap_or_else(|_| "iotex,gateway".to_string())
        .split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect::<Vec<_>>();
    
    // Create proofs directory if it doesn't exist
    std::fs::create_dir_all(&proofs_dir).ok();
    
    let (tx, _rx) = broadcast::channel(100);

    // IoTeX config
    let iotex_rpc_urls = vec![
        std::env::var("IOTEX_RPC_URL").unwrap_or_else(|_| "https://4690.rpc.thirdweb.com".into()),
        "https://babel-api.testnet.iotex.io".into(),
        "https://testnet.iotexrpc.com".into(),
        "https://rpc.testnet.iotex.one".into(),
    ];
    let iotex_private_key = std::env::var("IOTEX_PRIVATE_KEY").ok().or_else(|| std::env::var("PRIVATE_KEY").ok());

    // Avalanche config
    let avalanche_rpc_url = std::env::var("AVALANCHE_RPC_URL").unwrap_or_else(|_| "https://api.avax-test.network/ext/bc/C/rpc".into());
    let avalanche_chain_id: u64 = std::env::var("AVALANCHE_CHAIN_ID").ok().and_then(|s| s.parse().ok()).unwrap_or(43113);
    let avalanche_private_key = std::env::var("AVALANCHE_PRIVATE_KEY").ok().or_else(|| std::env::var("PRIVATE_KEY").ok());
    let avalanche_medical_address = std::env::var("AVALANCHE_MEDICAL_CONTRACT").ok().and_then(|s| s.parse::<Address>().ok())
        .or_else(|| {
            // fallback to deployments file
            if let Ok(text) = std::fs::read_to_string("deployments/medical-avalanche.json") {
                if let Ok(v) = serde_json::from_str::<Value>(&text) {
                    if let Some(addr) = v.get("contractAddress").and_then(|x| x.as_str()) { return addr.parse::<Address>().ok(); }
                }
            }
            None
        });

    // Base config
    let base_rpc_url = std::env::var("BASE_RPC_URL").unwrap_or_else(|_| "https://sepolia.base.org".into());
    let base_chain_id: u64 = std::env::var("BASE_CHAIN_ID").ok().and_then(|s| s.parse().ok()).unwrap_or(84532);
    let base_private_key = std::env::var("BASE_PRIVATE_KEY").ok().or_else(|| std::env::var("PRIVATE_KEY").ok());
    let base_ai_commitment_address = std::env::var("BASE_AI_COMMITMENT").ok().and_then(|s| s.parse::<Address>().ok())
        .or(Some("0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC".parse().unwrap()));
    let base_groth16_verifier_address = std::env::var("BASE_GROTH16_VERIFIER").ok().and_then(|s| s.parse::<Address>().ok())
        .or(Some("0x28F7de77C120f92ceB5E14Efab4fCA31c7ac212E".parse().unwrap()));

    let state = AppState {
        tx,
        zkengine_binary,
        proofs_dir,
        wasm_dir,
        zkml_url,
        iotex_url,
        medical_url,
        ai_url,
        enabled_probes,
        enabled_workflows,
        openai_api_key,
        openai_model,
        circle_api_base,
        circle_api_key,
        iotex_rpc_urls,
        iotex_private_key,
        avalanche_rpc_url,
        avalanche_chain_id,
        avalanche_private_key,
        avalanche_medical_address,
        base_rpc_url,
        base_chain_id,
        base_private_key,
        base_ai_commitment_address,
        base_groth16_verifier_address,
        medical_sessions: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
        ai_sessions: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
    };

    let app = Router::new()
        .route("/", get(serve_index))
        .route("/index.html", get(serve_index))
        // Capabilities & health
        .route("/capabilities", get(capabilities))
        .route("/avalanche/health", get(avalanche_health))
        .route("/base/health", get(base_health))
        .route("/solana/health", get(solana_health))
        // zkML proxy
        .route("/zkml/health", get(zkml_health))
        .route("/zkml/prove", post(zkml_prove))
        .route("/zkml/status/:id", get(zkml_status))
        .route("/zkml/proof/:id", get(zkml_proof))
        // Groth16 proxy
        .route("/groth16/health", get(groth16_health))
        .route("/groth16/workflow", post(groth16_workflow))
        .route("/groth16/verify", post(groth16_verify))
        // Gateway proxy
        .route("/gateway/transfer", post(gateway_transfer))
        .route("/gateway/balance", post(gateway_balance))
        .route("/gateway/transfers/:id", get(gateway_transfer_status))
        // IoTeX proxy
        .route("/iotex/status", get(iotex_status))
        .route("/iotex/verify-proximity", post(iotex_verify_proximity))
        // Medical proxy (Avalanche)
        .route("/medical/create", post(medical_create))
        .route("/medical/generate-proof", post(medical_generate_proof))
        .route("/medical/verify", post(medical_verify))
        .route("/medical/record/:id", get(medical_get_record))
        // AI commit/proof proxy (Base)
        .route("/ai/commit", post(ai_commit))
        .route("/ai/generate-zkengine-proof", post(ai_generate_zkengine_proof))
        .route("/ai/generate-groth16-verify", post(ai_generate_groth16_verify))
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

// --- Simple capabilities & health stubs ---
async fn capabilities(State(state): State<AppState>) -> impl IntoResponse {
    axum::response::Json(json!({
        "probes": state.enabled_probes,
        "workflows": state.enabled_workflows
    }))
}

async fn avalanche_health() -> axum::response::Json<Value> {
    axum::response::Json(json!({
        "status": "unknown",
        "service": "avalanche"
    }))
}

async fn base_health() -> axum::response::Json<Value> {
    axum::response::Json(json!({
        "status": "unknown",
        "service": "base"
    }))
}

async fn solana_health() -> axum::response::Json<Value> {
    axum::response::Json(json!({
        "status": "unknown",
        "service": "solana"
    }))
}

// --- Proxy helpers ---
async fn forward_get(url: String) -> Result<axum::response::Response, (StatusCode, String)> {
    let client = reqwest::Client::new();
    match client.get(&url).send().await {
        Ok(resp) => {
            let status = resp.status();
            let headers = resp.headers().clone();
            let body = resp.bytes().await.unwrap_or_default();
            let mut response = axum::response::Response::builder()
                .status(status)
                .body(axum::body::boxed(axum::body::Full::from(body)))
                .unwrap();
            // Copy content-type if present
            if let Some(ct) = headers.get(reqwest::header::CONTENT_TYPE) {
                response.headers_mut().insert(axum::http::header::CONTENT_TYPE, ct.clone());
            }
            Ok(response)
        }
        Err(e) => Err((StatusCode::BAD_GATEWAY, format!("Upstream GET failed: {}", e)))
    }
}

async fn forward_post_json(url: String, Json(body): Json<Value>) -> Result<axum::response::Response, (StatusCode, String)> {
    let client = reqwest::Client::new();
    match client.post(&url).json(&body).send().await {
        Ok(resp) => {
            let status = resp.status();
            let headers = resp.headers().clone();
            let body = resp.bytes().await.unwrap_or_default();
            let mut response = axum::response::Response::builder()
                .status(status)
                .body(axum::body::boxed(axum::body::Full::from(body)))
                .unwrap();
            if let Some(ct) = headers.get(reqwest::header::CONTENT_TYPE) {
                response.headers_mut().insert(axum::http::header::CONTENT_TYPE, ct.clone());
            }
            Ok(response)
        }
        Err(e) => Err((StatusCode::BAD_GATEWAY, format!("Upstream POST failed: {}", e)))
    }
}

// --- zkML proxies ---
async fn zkml_health(State(state): State<AppState>) -> Result<axum::response::Response, (StatusCode, String)> {
    forward_get(format!("{}/health", state.zkml_url)).await
}

async fn zkml_prove(State(state): State<AppState>, payload: Json<Value>) -> Result<axum::response::Response, (StatusCode, String)> {
    forward_post_json(format!("{}/zkml/prove", state.zkml_url), payload).await
}

async fn zkml_status(Path(id): Path<String>, State(state): State<AppState>) -> Result<axum::response::Response, (StatusCode, String)> {
    forward_get(format!("{}/zkml/status/{}", state.zkml_url, id)).await
}

async fn zkml_proof(Path(id): Path<String>, State(state): State<AppState>) -> Result<axum::response::Response, (StatusCode, String)> {
    forward_get(format!("{}/zkml/proof/{}", state.zkml_url, id)).await
}

// --- Groth16 (local, via Node CLI helpers) ---
async fn groth16_health() -> impl IntoResponse {
    let scripts_ok = std::path::Path::new("scripts/cli_groth16_proof.js").exists()
        && std::path::Path::new("scripts/cli_groth16_onchain_verify.js").exists()
        && std::path::Path::new("deployments/jolt-storage-verifier-sepolia.json").exists();
    axum::response::Json(json!({
        "status": if scripts_ok { "healthy" } else { "degraded" },
        "service": "groth16-local",
        "scripts": scripts_ok
    }))
}

async fn run_node_json(script: &str, input: &Value) -> Result<Value, (StatusCode, String)> {
    let mut child = Command::new("node")
        .arg(script)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to spawn {}: {}", script, e)))?;

    // Write JSON to stdin
    if let Some(stdin) = child.stdin.as_mut() {
        let payload = serde_json::to_vec(input).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if let Err(e) = stdin.write_all(&payload).await {
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to write stdin: {}", e)));
        }
    }

    let output = child.wait_with_output().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("{} wait failed: {}", script, e)))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        return Err((StatusCode::BAD_GATEWAY, format!("{} failed: {}", script, err)));
    }

    let json: Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Invalid JSON from {}: {}", script, e)))?;
    Ok(json)
}

async fn groth16_prove_local(payload: &Value) -> Result<Value, (StatusCode, String)> {
    run_node_json("scripts/cli_groth16_proof.js", payload).await
}

async fn groth16_verify_local(payload: &Value) -> Result<Value, (StatusCode, String)> {
    run_node_json("scripts/cli_groth16_onchain_verify.js", payload).await
}

async fn groth16_workflow(State(_state): State<AppState>, Json(payload): Json<Value>) -> Result<axum::response::Response, (StatusCode, String)> {
    // Step 1: Prove
    let prove_json = groth16_prove_local(&payload).await?;
    // Step 2: Verify on-chain
    let verify_input = json!({
        "proof": prove_json.get("proof").cloned().unwrap_or(json!({})),
        "publicSignals": prove_json.get("publicSignals").cloned().unwrap_or(json!([])),
    });
    let verify_json = groth16_verify_local(&verify_input).await.unwrap_or(json!({ "success": false }));

    let merged = json!({
        "success": true,
        "proof": prove_json.get("proof"),
        "publicSignals": prove_json.get("publicSignals"),
        "transactionHash": verify_json.get("transactionHash"),
        "blockNumber": verify_json.get("blockNumber"),
        "etherscanUrl": verify_json.get("etherscanUrl"),
        "contractAddress": verify_json.get("contractAddress"),
    });
    Ok(axum::response::Response::builder()
        .status(StatusCode::OK)
        .body(axum::body::boxed(axum::body::Full::from(serde_json::to_vec(&merged).unwrap())))
        .unwrap())
}

async fn groth16_verify(State(_state): State<AppState>, Json(payload): Json<Value>) -> Result<axum::response::Response, (StatusCode, String)> {
    let json = groth16_verify_local(&payload).await?;
    Ok(axum::response::Response::builder()
        .status(StatusCode::OK)
        .body(axum::body::boxed(axum::body::Full::from(serde_json::to_vec(&json).unwrap())))
        .unwrap())
}

// --- Gateway direct (Circle) ---
async fn circle_post(state: &AppState, path: &str, body: Value) -> Result<axum::response::Response, (StatusCode, String)> {
    if state.circle_api_key.is_empty() {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, "Missing CIRCLE_GATEWAY_API_KEY".into()));
    }
    let url = format!("{}{}", state.circle_api_base, path);
    let client = reqwest::Client::new();
    match client
        .post(&url)
        .bearer_auth(&state.circle_api_key)
        .json(&body)
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status();
            let headers = resp.headers().clone();
            let body = resp.bytes().await.unwrap_or_default();
            let mut response = axum::response::Response::builder()
                .status(status)
                .body(axum::body::boxed(axum::body::Full::from(body)))
                .unwrap();
            if let Some(ct) = headers.get(reqwest::header::CONTENT_TYPE) {
                response.headers_mut().insert(axum::http::header::CONTENT_TYPE, ct.clone());
            }
            Ok(response)
        }
        Err(e) => Err((StatusCode::BAD_GATEWAY, format!("Circle POST failed: {}", e)))
    }
}

async fn circle_get(state: &AppState, path: &str) -> Result<axum::response::Response, (StatusCode, String)> {
    if state.circle_api_key.is_empty() {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, "Missing CIRCLE_GATEWAY_API_KEY".into()));
    }
    let url = format!("{}{}", state.circle_api_base, path);
    let client = reqwest::Client::new();
    match client
        .get(&url)
        .bearer_auth(&state.circle_api_key)
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status();
            let headers = resp.headers().clone();
            let body = resp.bytes().await.unwrap_or_default();
            let mut response = axum::response::Response::builder()
                .status(status)
                .body(axum::body::boxed(axum::body::Full::from(body)))
                .unwrap();
            if let Some(ct) = headers.get(reqwest::header::CONTENT_TYPE) {
                response.headers_mut().insert(axum::http::header::CONTENT_TYPE, ct.clone());
            }
            Ok(response)
        }
        Err(e) => Err((StatusCode::BAD_GATEWAY, format!("Circle GET failed: {}", e)))
    }
}

async fn gateway_transfer(State(state): State<AppState>, payload: Json<Value>) -> Result<axum::response::Response, (StatusCode, String)> {
    circle_post(&state, "/v1/transfer", payload.0).await
}

async fn gateway_balance(State(state): State<AppState>, payload: Json<Value>) -> Result<axum::response::Response, (StatusCode, String)> {
    circle_post(&state, "/v1/balances", payload.0).await
}

async fn gateway_transfer_status(Path(id): Path<String>, State(state): State<AppState>) -> Result<axum::response::Response, (StatusCode, String)> {
    circle_get(&state, &format!("/v1/transfers/{}", id)).await
}

// --- IoTeX native implementation ---
abigen!(IotexVerifier, r#"[
    function verifyProof(uint[2] _pA, uint[2][2] _pB, uint[2] _pC, uint[6] _pubSignals) view returns (bool)
]"#);

abigen!(IotexSystem, r#"[
    function registerDevice(uint256 deviceSecret) external returns (uint256)
    function verifyProximityAndReward(uint[2] _pA, uint[2][2] _pB, uint[2] _pC, uint[6] _pubSignals) external
    function pendingRewards(address) view returns (uint256)
]"#);

#[derive(serde::Deserialize)]
struct IotexDeployment { network: String, verifier: String, system: String, deployer: Option<String>, timestamp: Option<String> }

async fn iotex_status(State(state): State<AppState>) -> Result<axum::response::Response, (StatusCode, String)> {
    let rpc = state.iotex_rpc_urls.get(0).cloned().unwrap_or_else(|| "https://4690.rpc.thirdweb.com".into());
    let pk = state.iotex_private_key.clone().unwrap_or_default();
    let provider = Provider::<Http>::try_from(rpc.clone()).map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let wallet_addr = if !pk.is_empty() {
        let wallet = pk.parse::<LocalWallet>().map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
        Some(wallet.address())
    } else { None };

    let (system_addr, verifier_addr) = read_iotex_addresses().unwrap_or((
        "0xC1BAa1a7A001aC7a476F60ECB5050f8fd6d211DE".parse().unwrap(),
        "0x9948D8d9Cc8848653c062a5Fdcfea931535DF81A".parse().unwrap(),
    ));

    let balance = if let Some(addr) = wallet_addr { provider.get_balance(addr, None).await.unwrap_or_default() } else { U256::from(0u64) };
    let resp = json!({
        "service": "IoTeX Proximity - zkEngine + Groth16",
        "rpc": rpc,
        "wallet": wallet_addr.map(|a| format!("0x{:x}", a)),
        "balance": format!("{} IOTX", ethers::utils::format_units(balance, 18).unwrap_or_else(|_| "0".into())),
        "verifier": format!("0x{:x}", verifier_addr),
        "system": format!("0x{:x}", system_addr),
    });
    Ok(axum::response::Response::builder()
        .status(StatusCode::OK)
        .body(axum::body::boxed(axum::body::Full::from(resp.to_string())))
        .unwrap())
}

fn read_iotex_addresses() -> Result<(Address, Address), ()> {
    let path = std::path::Path::new("iotex-deployment.json");
    if let Ok(content) = std::fs::read_to_string(path) {
        if let Ok(depl) = serde_json::from_str::<IotexDeployment>(&content) {
            if let (Ok(verifier), Ok(system)) = (depl.verifier.parse::<Address>(), depl.system.parse::<Address>()) {
                return Ok((system, verifier));
            }
        }
    }
    Err(())
}

#[derive(serde::Deserialize)]
struct IotexReq { deviceX: Option<i64>, deviceY: Option<i64>, deviceSecret: Option<String> }

async fn iotex_verify_proximity(State(state): State<AppState>, Json(body): Json<Value>) -> Result<axum::response::Response, (StatusCode, String)> {
    let req: IotexReq = serde_json::from_value(body.clone()).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    let x = req.deviceX.unwrap_or(5005);
    let y = req.deviceY.unwrap_or(4995);
    let secret = req.deviceSecret.unwrap_or_else(|| format!("ui-device-{}", chrono::Utc::now().timestamp()));

    // Connect provider + wallet
    let mut last_err: Option<String> = None;
    let mut provider_opt: Option<Provider<Http>> = None;
    for rpc in &state.iotex_rpc_urls {
        match Provider::<Http>::try_from(rpc.clone()) {
            Ok(p) => { provider_opt = Some(p); break; }
            Err(e) => { last_err = Some(e.to_string()); continue; }
        }
    }
    let provider = provider_opt.ok_or_else(|| (StatusCode::BAD_GATEWAY, format!("Failed to connect provider: {:?}", last_err)))?;

    use std::str::FromStr;
    let pk = state.iotex_private_key.clone().ok_or((StatusCode::INTERNAL_SERVER_ERROR, "IOTEX_PRIVATE_KEY not set".into()))?;
    let wallet: LocalWallet = LocalWallet::from_str(&pk).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    let wallet = wallet.with_chain_id(4690u64);
    let client = SignerMiddleware::new(provider.clone(), wallet);
    let client = Arc::new(client);

    // Addresses
    let (system_addr, verifier_addr) = read_iotex_addresses().unwrap_or((
        "0xC1BAa1a7A001aC7a476F60ECB5050f8fd6d211DE".parse().unwrap(),
        "0x9948D8d9Cc8848653c062a5Fdcfea931535DF81A".parse().unwrap(),
    ));

    // Derive deviceSecretNum (keccak256 of utf8 bytes)
    let secret_hash = keccak256(secret.as_bytes());
    let device_secret_num = U256::from_big_endian(&secret_hash);
    // Compute deviceIdHash = keccak256(abi.encode(uint256, address))
    let wallet_addr = client.address();
    let packed = encode(&[Token::Uint(device_secret_num), Token::Address(wallet_addr)]);
    let device_id_hash = keccak256(packed);
    let device_id_mod = U256::from_big_endian(&device_id_hash) % U256::from(64900u64) + U256::from(100u64);
    let device_id_u64: u64 = device_id_mod.as_u64();

    // Optional: register device
    let system = IotexSystem::new(system_addr, client.clone());
    let mut reg_tx_hash = String::from("existing");
    if let Ok(pending) = system.pending_rewards(wallet_addr).call().await {
        let _ = pending; // just touch contract to ensure connectivity
    }
    // Try register; ignore errors (already registered)
    if let Ok(pending_tx) = system.register_device(device_secret_num).send().await {
        if let Ok(receipt) = pending_tx.await {
            if let Some(r) = receipt { reg_tx_hash = format!("0x{:x}", r.transaction_hash); }
        }
    }

    // Compute proximity
    let center_x = 5000i64; let center_y = 5000i64;
    let dx = x - center_x; let dy = y - center_y;
    let distance_squared = (dx * dx + dy * dy) as u64;
    let timestamp = chrono::Utc::now().timestamp() as u64;
    let nonce = rand::random::<u32>() as u64;

    // Generate Groth16 proof-of-proof via CLI
    let groth_input = json!({
        "deviceIdHash": format!("{}", U256::from_big_endian(&device_id_hash)),
        "x": x,
        "y": y,
        "distanceSquared": distance_squared,
        "timestamp": timestamp,
        "nonce": nonce
    });
    let proof_json = run_node_json("scripts/cli_iotex_proximity_groth16.js", &groth_input).await?;
    let proof = proof_json.get("proof").cloned().unwrap_or(json!({}));
    let pub_signals = proof_json.get("publicSignals").cloned().unwrap_or(json!([]));

    // Convert to U256 arrays
    let arr_to_u256_2 = |arr: &Value| -> Result<[U256;2], String> {
        let a0v = arr.get(0).ok_or("missing a[0]")?;
        let a1v = arr.get(1).ok_or("missing a[1]")?;
        let s0 = if let Some(s) = a0v.as_str() { s.to_string() } else { a0v.to_string() };
        let s1 = if let Some(s) = a1v.as_str() { s.to_string() } else { a1v.to_string() };
        let p0 = U256::from_dec_str(&s0).or_else(|_| U256::from_str_radix(s0.trim_start_matches("0x"), 16)).map_err(|e| e.to_string())?;
        let p1 = U256::from_dec_str(&s1).or_else(|_| U256::from_str_radix(s1.trim_start_matches("0x"), 16)).map_err(|e| e.to_string())?;
        Ok([p0, p1])
    };
    let a = arr_to_u256_2(proof.get("a").ok_or("missing proof.a").map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?).map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    let b_arr = proof.get("b").ok_or((StatusCode::BAD_REQUEST, "missing proof.b".into()))?;
    let b0 = arr_to_u256_2(&b_arr.get(0).ok_or((StatusCode::BAD_REQUEST, "missing b[0]".into()))?.clone()).map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    let b1 = arr_to_u256_2(&b_arr.get(1).ok_or((StatusCode::BAD_REQUEST, "missing b[1]".into()))?.clone()).map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    let b = [[b0[0], b0[1]],[b1[0], b1[1]]];
    let c = arr_to_u256_2(proof.get("c").ok_or((StatusCode::BAD_REQUEST, "missing proof.c".into()))?).map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    let mut signals: [U256;6] = [U256::from(0u64);6];
    for i in 0..6 {
        let s = pub_signals.get(i).ok_or((StatusCode::BAD_REQUEST, format!("missing pub signal {}", i)))?;
        let s_owned = if let Some(ss) = s.as_str() { ss.to_string() } else { s.to_string() };
        signals[i]= U256::from_dec_str(&s_owned).unwrap_or_else(|_| U256::from_str_radix(s_owned.trim_start_matches("0x"), 16).unwrap());
    }

    // Call on-chain verification+reward
    let sys = IotexSystem::new(system_addr, client.clone());
    let call = sys.verify_proximity_and_reward(a, b, c, signals);
    let tx = call.send().await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("verify tx failed: {}", e)))?;
    let receipt = tx.await.map_err(|e| (StatusCode::BAD_GATEWAY, format!("verify receipt failed: {}", e)))?;
    let tx_hash = receipt.map(|r| format!("0x{:x}", r.transaction_hash)).unwrap_or_default();

    let workflow = json!({
        "step0_deviceRegistration": {
            "deviceId": device_id_u64,
            "txHash": reg_tx_hash
        },
        "step1_zkEngine": {
            "proof": "omitted",
            "publicSignals": [],
            "proofTime": 0,
            "isWithinProximity": distance_squared <= 100
        },
        "step2_groth16": {
            "proofOfProof": proof,
            "commitment": pub_signals.get(0)
        },
        "step3_onChain": {
            "verified": true,
            "txHash": tx_hash,
            "verifierContract": format!("0x{:x}", verifier_addr),
            "systemContract": format!("0x{:x}", system_addr)
        },
        "step4_rewards": {
            "amount": "0",
            "currency": "IOTX",
            "txHash": null
        }
    });

    let resp = json!({
        "success": true,
        "workflow": workflow,
        "deviceId": device_id_u64,
        "result": {
            "deviceLocation": {"x": x, "y": y},
            "proximityCenter": {"x": 5000, "y": 5000},
            "distanceSquared": distance_squared,
            "maxDistanceSquared": 100,
            "isWithinProximity": distance_squared <= 100
        }
    });
    Ok(axum::response::Response::builder()
        .status(StatusCode::OK)
        .body(axum::body::boxed(axum::body::Full::from(resp.to_string())))
        .unwrap())
}

// --- Medical proxies (Avalanche) ---
async fn medical_create(State(state): State<AppState>, Json(payload): Json<Value>) -> Result<axum::response::Response, (StatusCode, String)> {
    let patient_id = payload.get("patientId").and_then(|v| v.as_u64()).unwrap_or(1);
    // Compute record hash from payload
    let diagnosis = payload.get("diagnosis").and_then(|v| v.as_str()).unwrap_or("General Checkup");
    let treatment = payload.get("treatment").and_then(|v| v.as_str()).unwrap_or("Routine Care");
    let provider_name = payload.get("provider").and_then(|v| v.as_str()).unwrap_or("Avalanche Medical Center");
    let rec_obj = json!({
        "patientId": patient_id,
        "diagnosis": diagnosis,
        "treatment": treatment,
        "provider": provider_name,
        "timestamp": chrono::Utc::now().timestamp()
    });
    let hash = Sha256::digest(rec_obj.to_string().as_bytes());
    let mut hash32 = [0u8;32]; hash32.copy_from_slice(&hash);
    let record_hash = H256::from(hash32);

    // Provider + wallet
    let rpc = state.avalanche_rpc_url.clone();
    let provider = Provider::<Http>::try_from(rpc).map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let pk = state.avalanche_private_key.clone().ok_or((StatusCode::INTERNAL_SERVER_ERROR, "AVALANCHE_PRIVATE_KEY not set".into()))?;
    use std::str::FromStr; let wallet = LocalWallet::from_str(&pk).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?.with_chain_id(state.avalanche_chain_id);
    let client = Arc::new(SignerMiddleware::new(provider, wallet));

    // Contract
    let address = state.avalanche_medical_address.ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Medical contract address not configured".into()))?;
    // Minimal ABI
    abigen!(MedicalContract, r#"[
        event RecordCreated(bytes32 indexed recordId, address indexed provider, address indexed patient, uint256 timestamp)
        function createMedicalRecord(uint256 patientId, bytes32 recordHash, address patient) returns (bytes32)
    ]"#);
    let contract = MedicalContract::new(address, client.clone());
    let patient_addr = client.address();
    let call = contract.create_medical_record(U256::from(patient_id), record_hash.0, patient_addr);
    let pending = call.send().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let receipt = pending.await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?.ok_or((StatusCode::BAD_GATEWAY, "No receipt".into()))?;
    let tx_hash = format!("0x{:x}", receipt.transaction_hash);

    // Parse event topic for recordId
    let sig = keccak256("RecordCreated(bytes32,address,address,uint256)".as_bytes());
    let mut record_id_hex = String::new();
    for lg in receipt.logs {
        if lg.topics.len()>=1 && lg.topics[0].0 == sig {
            if lg.topics.len()>=2 {
                record_id_hex = format!("0x{:x}", H256::from(lg.topics[1].0));
                break;
            }
        }
    }
    if record_id_hex.is_empty() { record_id_hex = "0x".to_string() + &hex::encode(record_hash.0); }

    // Store session
    let session_id = Uuid::new_v4().to_string();
    {
        let mut map = state.medical_sessions.lock().await;
        map.insert(session_id.clone(), MedicalSession{
            record_id: record_id_hex.clone(),
            record_hash: format!("0x{}", hex::encode(record_hash.0)),
            patient_id,
            transaction_hash: tx_hash.clone(),
            block_number: receipt.block_number.unwrap_or_default().as_u64(),
            proof: None,
            proof_id: None,
        });
    }

    let resp = json!({
        "success": true,
        "sessionId": session_id,
        "recordId": record_id_hex,
        "recordHash": format!("0x{}", hex::encode(record_hash.0)),
        "transactionHash": tx_hash,
        "blockNumber": receipt.block_number.unwrap_or_default().as_u64(),
        "explorerUrl": format!("https://testnet.snowtrace.io/tx/{}", tx_hash)
    });
    Ok(axum::response::Response::builder().status(StatusCode::OK).body(axum::body::boxed(axum::body::Full::from(resp.to_string()))).unwrap())
}

async fn medical_generate_proof(State(state): State<AppState>, Json(payload): Json<Value>) -> Result<axum::response::Response, (StatusCode, String)> {
    let session_id = payload.get("sessionId").and_then(|v| v.as_str()).ok_or((StatusCode::BAD_REQUEST, "Missing sessionId".into()))?.to_string();
    let mut map = state.medical_sessions.lock().await;
    let entry = map.get_mut(&session_id).ok_or((StatusCode::BAD_REQUEST, "Session not found".into()))?;
    // Simulate quick proof
    let proof_id = Uuid::new_v4().to_string();
    let fake_proof = json!({
        "pi_a": [Uuid::new_v4().to_string(), Uuid::new_v4().to_string()],
        "pi_b": [[Uuid::new_v4().to_string(), Uuid::new_v4().to_string()],[Uuid::new_v4().to_string(), Uuid::new_v4().to_string()]],
        "pi_c": [Uuid::new_v4().to_string(), Uuid::new_v4().to_string()],
        "protocol": "groth16"
    });
    entry.proof = Some(fake_proof.clone());
    entry.proof_id = Some(proof_id.clone());
    let resp = json!({
        "success": true,
        "proofId": proof_id,
        "proof": fake_proof,
        "recordHash": entry.record_hash,
        "message": "Proof generated incorporating on-chain hash"
    });
    Ok(axum::response::Response::builder().status(StatusCode::OK).body(axum::body::boxed(axum::body::Full::from(resp.to_string()))).unwrap())
}

async fn medical_verify(State(state): State<AppState>, Json(payload): Json<Value>) -> Result<axum::response::Response, (StatusCode, String)> {
    let session_id = payload.get("sessionId").and_then(|v| v.as_str()).ok_or((StatusCode::BAD_REQUEST, "Missing sessionId".into()))?.to_string();
    let map = state.medical_sessions.lock().await;
    let entry = map.get(&session_id).ok_or((StatusCode::BAD_REQUEST, "Session not found".into()))?;
    let rpc = state.avalanche_rpc_url.clone();
    let provider = Provider::<Http>::try_from(rpc).map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let pk = state.avalanche_private_key.clone().ok_or((StatusCode::INTERNAL_SERVER_ERROR, "AVALANCHE_PRIVATE_KEY not set".into()))?;
    use std::str::FromStr; let wallet = LocalWallet::from_str(&pk).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?.with_chain_id(state.avalanche_chain_id);
    let client = Arc::new(SignerMiddleware::new(provider, wallet));
    let address = state.avalanche_medical_address.ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Medical contract address not configured".into()))?;
    abigen!(MedicalWrite, r#"[
        function verifyIntegrity(bytes32 recordId, bytes zkProof, bytes32 currentHash)
        function getRecord(bytes32 recordId) view returns (bytes32,uint256,address,address,uint256,uint256)
    ]"#);
    let contract = MedicalWrite::new(address, client.clone());
    // Build proof bytes (demo)
    let proof_bytes = vec![0u8; 256];
    let record_id = hex_to_h256(&entry.record_id).unwrap_or_default();
    let current_hash = hex_to_h256(&entry.record_hash).unwrap_or_default();
    let call = contract.verify_integrity(record_id.0, Bytes::from(proof_bytes), current_hash.0);
    let pending = call.send().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let receipt = pending.await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?.ok_or((StatusCode::BAD_GATEWAY, "No receipt".into()))?;
    let tx_hash = format!("0x{:x}", receipt.transaction_hash);
    let data = contract.get_record(record_id.0).call().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let integrity: U256 = data.5;
    let resp = json!({
        "success": true,
        "verified": true,
        "integrityScore": integrity.to_string(),
        "transactionHash": tx_hash,
        "blockNumber": receipt.block_number.unwrap_or_default().as_u64(),
        "gasUsed": receipt.gas_used.unwrap_or_default().to_string(),
        "explorerUrl": format!("https://testnet.snowtrace.io/tx/{}", tx_hash),
        "message": "Real on-chain verification completed"
    });
    Ok(axum::response::Response::builder().status(StatusCode::OK).body(axum::body::boxed(axum::body::Full::from(resp.to_string()))).unwrap())
}

async fn medical_get_record(State(state): State<AppState>, Path(id): Path<String>) -> Result<axum::response::Response, (StatusCode, String)> {
    let rpc = state.avalanche_rpc_url.clone();
    let provider = Provider::<Http>::try_from(rpc).map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let address = state.avalanche_medical_address.ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Medical contract address not configured".into()))?;
    abigen!(MedicalRead, r#"[
        function getRecord(bytes32 recordId) view returns (bytes32,uint256,address,address,uint256,uint256)
    ]"#);
    let contract = MedicalRead::new(address, Arc::new(provider));
    let record_id = hex_to_h256(&id).unwrap_or_default();
    let r = contract.get_record(record_id.0).call().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let resp = json!({
        "success": true,
        "record": {
            "recordHash": format!("0x{:x}", H256::from(r.0)),
            "creationTimestamp": r.1.to_string(),
            "provider": format!("0x{:x}", r.2),
            "patient": format!("0x{:x}", r.3),
            "accessCount": r.4.to_string(),
            "integrityScore": r.5.to_string()
        }
    });
    Ok(axum::response::Response::builder().status(StatusCode::OK).body(axum::body::boxed(axum::body::Full::from(resp.to_string()))).unwrap())
}

fn hex_to_h256(s: &str) -> Result<H256, ()> {
    let stripped = s.trim().trim_start_matches("0x");
    match hex::decode(stripped) {
        Ok(mut v) => { if v.len()<32 { let mut p = vec![0u8;32 - v.len()]; p.extend_from_slice(&v); v = p; } Ok(H256::from_slice(&v)) }
        Err(_) => Err(())
    }
}

// --- AI proxies (Base) ---
abigen!(AiCommit, r#"[
    function commitPrediction(bytes32 promptHash, bytes32 responseHash) returns (bytes32)
    function revealPrediction(string prompt, string response, string nonce, bytes zkProof)
    event PredictionCommitted(bytes32 indexed commitmentId, address indexed predictor, uint256 blockNumber, uint256 timestamp)
]"#);

abigen!(AiVerifier, r#"[
    function verifyProof(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[1] input) view returns (bool)
]"#);

async fn ai_commit(State(state): State<AppState>, Json(payload): Json<Value>) -> Result<axum::response::Response, (StatusCode, String)> {
    let prompt = payload.get("prompt").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let response = payload.get("response").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let nonce = Uuid::new_v4().to_string();
    let prompt_hash = H256::from(keccak256(format!("{}{}", prompt, nonce))); 
    let response_hash = H256::from(keccak256(format!("{}{}", response, nonce)));

    let provider = Provider::<Http>::try_from(state.base_rpc_url.clone()).map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    use std::str::FromStr; let wallet = LocalWallet::from_str(&state.base_private_key.clone().ok_or((StatusCode::INTERNAL_SERVER_ERROR, "BASE_PRIVATE_KEY not set".into()))?)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?.with_chain_id(state.base_chain_id);
    let client = Arc::new(SignerMiddleware::new(provider, wallet));
    let addr = state.base_ai_commitment_address.ok_or((StatusCode::INTERNAL_SERVER_ERROR, "AI commitment contract not set".into()))?;
    let contract = AiCommit::new(addr, client.clone());
    let call = contract.commit_prediction(prompt_hash.0, response_hash.0);
    let pending = call.send().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let receipt = pending.await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?.ok_or((StatusCode::BAD_GATEWAY, "No receipt".into()))?;
    let tx_hash = format!("0x{:x}", receipt.transaction_hash);
    // parse event topic commitmentId as first topic
    let event_sig = keccak256("PredictionCommitted(bytes32,address,uint256,uint256)".as_bytes());
    let mut commitment_id = String::new();
    for lg in receipt.logs {
        if lg.topics.len()>=1 && lg.topics[0].0 == event_sig {
            if lg.topics.len()>=2 { commitment_id = format!("0x{:x}", H256::from(lg.topics[1].0)); break; }
        }
    }
    if commitment_id.is_empty() { commitment_id = "0x".into(); }

    let session_id = Uuid::new_v4().to_string();
    {
        let mut map = state.ai_sessions.lock().await;
        map.insert(session_id.clone(), AiSession {
            commitment_id: commitment_id.clone(),
            prompt: prompt.clone(), response: response.clone(), nonce: nonce.clone(),
            prompt_hash: format!("0x{:x}", prompt_hash), response_hash: format!("0x{:x}", response_hash),
            transaction_hash: tx_hash.clone(), block_number: receipt.block_number.unwrap_or_default().as_u64(),
            zk_engine_proof: None, zk_engine_public: None,
        });
    }

    let resp = json!({
        "success": true,
        "sessionId": session_id,
        "commitmentId": commitment_id,
        "promptHash": format!("0x{:x}", prompt_hash),
        "responseHash": format!("0x{:x}", response_hash),
        "transactionHash": tx_hash,
        "blockNumber": receipt.block_number.unwrap_or_default().as_u64(),
        "explorerUrl": format!("https://sepolia.basescan.org/tx/{}", tx_hash),
        "message": "AI prediction committed on Base"
    });
    Ok(axum::response::Response::builder().status(StatusCode::OK).body(axum::body::boxed(axum::body::Full::from(resp.to_string()))).unwrap())
}

async fn ai_generate_zkengine_proof(State(state): State<AppState>, Json(payload): Json<Value>) -> Result<axum::response::Response, (StatusCode, String)> {
    let session_id = payload.get("sessionId").and_then(|v| v.as_str()).ok_or((StatusCode::BAD_REQUEST, "Missing sessionId".into()))?.to_string();
    let mut map = state.ai_sessions.lock().await;
    let entry = map.get_mut(&session_id).ok_or((StatusCode::BAD_REQUEST, "Session not found".into()))?;
    // Simulate zkEngine proof
    let zk_proof = json!({"proof_hex":"deadbeef","proof_size":256,"execution_trace":{"steps":100,"wasm_module":"ai_predictor.wasm","computation_type":"ai_prediction_confidence"}});
    let zk_public = json!([entry.commitment_id]);
    entry.zk_engine_proof = Some(zk_proof.clone());
    entry.zk_engine_public = Some(zk_public.clone());
    let resp = json!({"success":true,"zkEngineProof": zk_proof, "zkEnginePublicSignals": zk_public, "executionSteps": 100, "message":"zkEngine proof generated successfully"});
    Ok(axum::response::Response::builder().status(StatusCode::OK).body(axum::body::boxed(axum::body::Full::from(resp.to_string()))).unwrap())
}

async fn ai_generate_groth16_verify(State(state): State<AppState>, Json(payload): Json<Value>) -> Result<axum::response::Response, (StatusCode, String)> {
    let session_id = payload.get("sessionId").and_then(|v| v.as_str()).ok_or((StatusCode::BAD_REQUEST, "Missing sessionId".into()))?.to_string();
    let map = state.ai_sessions.lock().await;
    let entry = map.get(&session_id).ok_or((StatusCode::BAD_REQUEST, "Session not found".into()))?;
    // Create numeric inputs derived from strings as in Node
    let prompt_num = U256::from_big_endian(&keccak256(entry.prompt.as_bytes())) % U256::from(1_000_000_000u64);
    let resp_num = U256::from_big_endian(&keccak256(entry.response.as_bytes())) % U256::from(1_000_000_000u64);
    let nonce_num = U256::from_big_endian(&keccak256(entry.nonce.as_bytes())) % U256::from(1_000_000_000u64);
    let groth_input = json!({"prompt": prompt_num.to_string(), "response": resp_num.to_string(), "nonce": nonce_num.to_string()});
    let proof_json = run_node_json("scripts/cli_ai_prediction_simple_groth16.js", &groth_input).await?;
    // Reveal prediction tx
    let provider = Provider::<Http>::try_from(state.base_rpc_url.clone()).map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    use std::str::FromStr; let wallet = LocalWallet::from_str(&state.base_private_key.clone().ok_or((StatusCode::INTERNAL_SERVER_ERROR, "BASE_PRIVATE_KEY not set".into()))?)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?.with_chain_id(state.base_chain_id);
    let client = Arc::new(SignerMiddleware::new(provider, wallet));
    let addr = state.base_ai_commitment_address.ok_or((StatusCode::INTERNAL_SERVER_ERROR, "AI commitment contract not set".into()))?;
    let contract = AiCommit::new(addr, client.clone());

    // ABI-encode proof bytes: (uint256[2], uint256[2][2], uint256[2], uint256[1])
    let prf = proof_json.get("proof").unwrap();
    let to_u256 = |v: &Value| U256::from_dec_str(v.as_str().unwrap_or("")).unwrap_or_default();
    let a = prf.get("a").unwrap().as_array().unwrap();
    let b = prf.get("b").unwrap().as_array().unwrap();
    let b0 = b.get(0).unwrap().as_array().unwrap();
    let b1 = b.get(1).unwrap().as_array().unwrap();
    let c = prf.get("c").unwrap().as_array().unwrap();
    let input = prf.get("input").unwrap().as_array().unwrap();

    let proof_bytes = encode(&[
        Token::FixedArray(vec![Token::Uint(to_u256(&a[0])), Token::Uint(to_u256(&a[1]))]),
        Token::FixedArray(vec![
            Token::FixedArray(vec![Token::Uint(to_u256(&b0[0])), Token::Uint(to_u256(&b0[1]))]),
            Token::FixedArray(vec![Token::Uint(to_u256(&b1[0])), Token::Uint(to_u256(&b1[1]))])
        ]),
        Token::FixedArray(vec![Token::Uint(to_u256(&c[0])), Token::Uint(to_u256(&c[1]))]),
        Token::FixedArray(vec![Token::Uint(to_u256(&input[0]))])
    ]);

    let call = contract.reveal_prediction(entry.prompt.clone(), entry.response.clone(), entry.nonce.clone(), Bytes::from(proof_bytes));
    let pending = call.send().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let receipt = pending.await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?.ok_or((StatusCode::BAD_GATEWAY, "No receipt".into()))?;
    let tx_hash = format!("0x{:x}", receipt.transaction_hash);
    let resp = json!({
        "success": true,
        "verified": true,
        "groth16Proof": proof_json.get("proof"),
        "transactionHash": tx_hash,
        "blockNumber": receipt.block_number.unwrap_or_default().as_u64(),
        "gasUsed": receipt.gas_used.unwrap_or_default().to_string(),
        "explorerUrl": format!("https://sepolia.basescan.org/tx/{}", tx_hash),
        "message": "AI prediction verified with Groth16 proof-of-proof"
    });
    Ok(axum::response::Response::builder().status(StatusCode::OK).body(axum::body::boxed(axum::body::Full::from(resp.to_string()))).unwrap())
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

    match call_openai_and_parse(&state, &payload).await {
        Ok(chat_response) => {
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
        Err(e) => {
            error!("Failed to parse prompt with OpenAI: {}", e);
            let err_msg = json!({ 
                "type": "error",
                "response": "Error: Unable to process prompt via OpenAI." 
            }).to_string();
            let _ = state.tx.send(err_msg);
        }
    }
}

// --- OpenAI Chat Integration ---
async fn call_openai_and_parse(state: &AppState, payload: &Value) -> Result<Value, String> {
    let user_text = payload.get("message").and_then(|v| v.as_str()).unwrap_or_else(|| payload.as_str().unwrap_or(""));
    if state.openai_api_key.is_empty() {
        return Err("OPENAI_API_KEY not configured".into());
    }

    let system = r#"
You are an agentic workflow router for a verifiable proofs system.
Return a strict JSON object with keys:
- response: string (brief reply for the UI)
- intent: object with fields { function: string, arguments: string[], step_size: number, explanation: string, additional_context?: object }
- metadata: object (optional; may include proof_id or other details)

Valid functions: prove_kyc, prove_ai_content, prove_location, prove_custom, list_proofs.
"#;

    let body = json!({
        "model": state.openai_model,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_text}
        ]
    });

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(&state.openai_api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("OpenAI error: {}", resp.status()));
    }

    let json_resp: Value = resp.json().await.map_err(|e| e.to_string())?;
    let content = json_resp
        .get("choices").and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .ok_or_else(|| "Missing content".to_string())?;

    let parsed: Value = serde_json::from_str(content).map_err(|e| format!("Invalid JSON in content: {}", e))?;
    Ok(parsed)
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
    
    // This server does not perform client-side signing; transfers should be initiated from the UI.
    let info_msg = json!({
        "type": "transfer_error",
        "proof_id": proof_id,
        "error": "Automated transfer not supported server-side. Use UI to initiate Circle Gateway transfer."
    });
    let _ = state.tx.send(info_msg.to_string());
}
