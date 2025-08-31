#!/bin/bash

echo "
╔══════════════════════════════════════════════════════════════╗
║         NovaNet × Google A2A Integration Demo               ║
║                                                              ║
║  Verifiable AI Agents with zkML Proof Generation            ║
╚══════════════════════════════════════════════════════════════╝
"

# Check if backend is already running
if lsof -Pi :8003 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Google A2A backend already running on port 8003"
else
    echo "🚀 Starting Google A2A backend on port 8003..."
    node demo-backend.js &
    BACKEND_PID=$!
    sleep 2
fi

# Check if zkML backend is running (optional but recommended)
if lsof -Pi :8002 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ zkML backend detected on port 8002 (REAL proofs enabled)"
else
    echo "⚠️  zkML backend not running on port 8002 (using simulated proofs)"
    echo "   To enable REAL proofs, run: node api/zkml-llm-decision-backend.js"
fi

# Start web server
echo ""
echo "🌐 Starting web server..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   🎯 Demo ready at: http://localhost:8000/google-a2a/"
echo ""
echo "   Features:"
echo "   • Single Agent Processing with zkML verification"
echo "   • Multi-Agent Workflows with proof chain"
echo "   • A2A Protocol Handoffs with verification"
echo ""
echo "   Available Agents:"
echo "   💰 Loan Processor (Gemini 1.5 Pro)"
echo "   🏥 Medical Diagnosis (Gemini 1.5 Pro)"
echo "   🔍 Fraud Detector (Gemini 1.5 Flash)"
echo "   ⚠️  Risk Assessor (Gemini 1.5 Flash)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop the demo"
echo ""

# Serve the demo
cd ..
python3 -m http.server 8000 --bind 127.0.0.1

# Cleanup on exit
if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null
fi