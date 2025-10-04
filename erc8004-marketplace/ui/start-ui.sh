#!/bin/bash

# zkML Agent Auditor UI Dashboard - Start Script
# This script starts the UI server on port 9003

echo ""
echo "════════════════════════════════════════════════════════════"
echo "🔒 zkML Agent Auditor UI Dashboard"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "   Please install Node.js: https://nodejs.org"
    exit 1
fi

# Check if port 9003 is already in use
if lsof -Pi :9003 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 9003 is already in use"
    echo ""
    read -p "   Kill existing process? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:9003 | xargs kill -9 2>/dev/null
        echo "   ✓ Killed existing process"
        sleep 1
    else
        echo "   Exiting..."
        exit 1
    fi
fi

# Check prerequisites
echo "📋 Checking Prerequisites:"
echo ""

# Check if backend is running
if curl -s http://localhost:9002/health > /dev/null 2>&1; then
    echo "   ✓ Backend API (port 9002) - Running"
else
    echo "   ⚠️  Backend API (port 9002) - NOT RUNNING"
    echo "      Start with: cd backend && node server.js"
fi

# Check if JOLT-Atlas is running
if curl -s http://localhost:9001/health > /dev/null 2>&1; then
    echo "   ✓ JOLT-Atlas (port 9001) - Running"
else
    echo "   ⚠️  JOLT-Atlas (port 9001) - NOT RUNNING"
    echo "      Start with: cd ../jolt-atlas && ./target/debug/llm_prover"
fi

echo ""
echo "📦 Contract Addresses (Base Sepolia):"
echo "   Registry:  0xF86630d38fd30dE173A7548806e1f12522dC5E27"
echo "   Verifier:  0xf752509cb5af017f465B42053d41B730991c6624"
echo "   USDC:      0x036CbD53842c5426634e7929541eC2318f3dCF7e"
echo ""

# Change to UI directory
cd "$(dirname "$0")"

# Start server
echo "🚀 Starting UI Server..."
echo ""

node server.js
