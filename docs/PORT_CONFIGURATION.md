# Port Configuration

## Current Setup

AgentKit uses only **2 ports**:

### Port 8001 - Rust Server (Main)
- **WebSocket API**: `ws://localhost:8001/ws`
- **Static Files (UI)**: `http://localhost:8001/static/*`
- **REST API**: `http://localhost:8001/api/v1/*`
- **Main UI Access**: `http://localhost:8001`

The Rust server handles:
- WebSocket connections for real-time updates
- Serving the frontend UI from `/static` directory
- REST API endpoints for proof verification
- zkEngine binary execution

### Port 8002 - Python AI Service
- **Chat API**: `http://localhost:8002/chat`
- **Health Check**: `http://localhost:8002/health`

The Python service handles:
- Natural language processing with OpenAI
- Workflow parsing and execution
- Command interpretation

## No Separate Web Server

Unlike many web applications, AgentKit does **NOT** use a separate web server on port 8000 or any other port. The Rust server on port 8001 serves everything:

```rust
// From src/main.rs
.nest_service("/static", tower_http::services::ServeDir::new("static"))
```

## Accessing the Application

1. Start the Rust server: `cargo run`
2. Start the Python service: `python3 services/chat_service.py`
3. Open browser to: `http://localhost:8001`

## URL Structure

- Main UI: `http://localhost:8001` (redirects to `/static/index.html`)
- Static files: `http://localhost:8001/static/*`
- API endpoints: `http://localhost:8001/api/v1/*`
- WebSocket: `ws://localhost:8001/ws`

## Configuration

In `.env`:
```env
PORT=8001                    # Rust server port
CHAT_SERVICE_PORT=8002       # Python AI service port
```

## Common Mistakes

❌ **Wrong**: Running `python3 -m http.server 8000`
✅ **Correct**: Just run the Rust server which serves static files

❌ **Wrong**: Accessing `http://localhost:8000`
✅ **Correct**: Access `http://localhost:8001`

❌ **Wrong**: Three terminals for three services
✅ **Correct**: Two terminals - one for Rust, one for Python