# Port Configuration

## Current Setup

AgentKit uses only **2 ports**:

### Port 8001 — Unified Rust Server
- Main UI: `http://localhost:8001` (serves `static/index.html`)
- Static assets: `http://localhost:8001/static/*`
- WebSocket: `ws://localhost:8001/ws`
- REST API (examples):
  - `POST /medical/create`
  - `POST /medical/generate-proof`
  - `POST /medical/verify`
  - `POST /zkml/prove`

The Rust server handles:
- Serving the frontend UI and static files
- WebSocket events for live updates
- REST endpoints for workflows (Avalanche/Base/IoTeX/Gateway)
- Local zkEngine/JOLT‑Atlas proof execution

### OpenAI Parsing (no separate service)
- Rust backend calls OpenAI directly using `OPENAI_API_KEY` to parse free‑form prompts into structured intents.
- OpenAI does not run proofs or chain transactions.

## No Separate Web Server

AgentKit serves everything from port 8001. Static files are mounted at `/static`:

```rust
// From src/main.rs
.nest_service("/static", tower_http::services::ServeDir::new("static"))
```

## Accessing the Application

1. Start the server: `cargo run`
2. Open: `http://localhost:8001`

## URL Structure

- Main UI: `http://localhost:8001` (serves `static/index.html`)
- Static files: `http://localhost:8001/static/*`
- REST endpoints: `http://localhost:8001/<service>/*` (see examples above)
- WebSocket: `ws://localhost:8001/ws`

## Configuration

In `.env`:
```env
PORT=8001                    # Rust server port
OPENAI_API_KEY=...           # OpenAI key for agentic parsing
```

## Common Mistakes

❌ **Wrong**: Running `python3 -m http.server 8000`
✅ **Correct**: Just run the Rust server which serves static files

❌ **Wrong**: Accessing `http://localhost:8000`
✅ **Correct**: Access `http://localhost:8001`

❌ **Wrong**: Three terminals for three services
✅ **Correct**: One terminal for Rust is sufficient (optional second for logs)
