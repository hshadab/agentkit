#!/bin/bash
# Wrapper script for SNARK generation with proper error handling

INPUT_FILE=$1

if [ -z "$INPUT_FILE" ]; then
    echo '{"error": "No input file provided"}' >&2
    exit 1
fi

# Run node with explicit timeout and capture both stdout and stderr
timeout 180s node src/generate_snark_proof.js "$INPUT_FILE" 2>/tmp/snark_error.log

EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ]; then
    # Timeout occurred
    echo '{"error": "SNARK generation timed out after 180 seconds"}' >&2
    exit 1
elif [ $EXIT_CODE -ne 0 ]; then
    # Other error
    ERROR_MSG=$(cat /tmp/snark_error.log 2>/dev/null || echo "Unknown error")
    echo "{\"error\": \"SNARK generation failed: $ERROR_MSG\"}" >&2
    exit 1
fi