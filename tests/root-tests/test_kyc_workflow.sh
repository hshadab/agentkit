#!/bin/bash
echo "Testing KYC workflow..."
curl -X POST http://localhost:8002/execute_workflow \
  -H "Content-Type: application/json" \
  -d '{"command": "Generate KYC proof"}' \
  --max-time 70 \
  -v 2>&1 | grep -E "(HTTP|{|})"|head -20