#!/bin/bash

# Script to analyze logs for duplicate workflow requests

echo "=== Analyzing Logs for Duplicate Workflows ==="
echo "Command: 'Send 0.1 USDC to Alice on Ethereum if KYC compliant'"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to analyze log file
analyze_log() {
    local log_file=$1
    local service_name=$2
    
    echo -e "${GREEN}=== $service_name Logs ===${NC}"
    
    # Extract relevant log entries
    echo -e "${YELLOW}Query/Chat Requests:${NC}"
    grep -E "QUERY_REQUEST_RUST|CHAT_REQUEST" "$log_file" | tail -20
    
    echo -e "\n${YELLOW}Workflow Requests:${NC}"
    grep -E "WORKFLOW_REQUEST" "$log_file" | tail -20
    
    echo -e "\n${YELLOW}Workflow IDs Created:${NC}"
    grep -E "workflow_id|workflowId" "$log_file" | grep -E "wf_[0-9]+" -o | sort | uniq -c
    
    echo -e "\n${YELLOW}Timestamp Analysis:${NC}"
    # Look for requests within 1 second of each other
    grep -E "QUERY_REQUEST_RUST|CHAT_REQUEST|WORKFLOW_REQUEST" "$log_file" | \
        awk '{print $2}' | sort | uniq -c | sort -rn | head -10
    
    echo ""
}

# Check if log files are provided as arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <rust_log_file> <python_log_file>"
    echo "Example: $0 rust_service.log python_service.log"
    echo ""
    echo "To capture logs:"
    echo "  Rust service: cargo run 2>&1 | tee rust_service.log"
    echo "  Python service: python chat_service.py 2>&1 | tee python_service.log"
    exit 1
fi

RUST_LOG=$1
PYTHON_LOG=$2

if [ -f "$RUST_LOG" ]; then
    analyze_log "$RUST_LOG" "Rust Service"
else
    echo -e "${RED}Rust log file not found: $RUST_LOG${NC}"
fi

if [ -f "$PYTHON_LOG" ]; then
    analyze_log "$PYTHON_LOG" "Python Service"
else
    echo -e "${RED}Python log file not found: $PYTHON_LOG${NC}"
fi

# Look for duplicate patterns
echo -e "${GREEN}=== Duplicate Detection ===${NC}"
echo -e "${YELLOW}Checking for multiple workflow IDs in close succession:${NC}"

# Extract timestamps and workflow IDs
if [ -f "$PYTHON_LOG" ]; then
    grep "WORKFLOW_REQUEST.*Workflow ID" "$PYTHON_LOG" | \
        awk '{print $2, $NF}' | \
        sort | \
        awk '{
            if (prev_time && $1 - prev_time < 1) {
                print "DUPLICATE DETECTED: " $0 " (within 1 second of previous)"
            }
            prev_time = $1
            print $0
        }'
fi

echo -e "\n${YELLOW}Summary:${NC}"
echo "1. Check if the same command appears multiple times in quick succession"
echo "2. Look for multiple workflow IDs being created"
echo "3. Verify if timestamps are very close together (indicating duplicate requests)"