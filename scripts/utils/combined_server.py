#!/usr/bin/env python3
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from chat_service import app as api_app

app = FastAPI()
app.mount("/api", api_app)

@app.get("/", response_class=HTMLResponse)
async def frontend():
    with open("simple_frontend.html", "r") as f:
        return f.read()

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting simple combined server on port 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
