#!/bin/bash
# Wrapper script to ensure proper environment for SNARK generation

cd /home/hshadab/agentkit
export NODE_PATH=/home/hshadab/agentkit/node_modules
exec node src/generate_snark_proof.js "$@"