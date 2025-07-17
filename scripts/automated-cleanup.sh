#!/bin/bash

# Automated cleanup script for cron
# Add to crontab: 0 2 * * * /path/to/agentkit/scripts/automated-cleanup.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/../logs/cleanup-$(date +%Y%m%d).log"

# Create logs directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/../logs"

echo "[$(date)] Starting automated cleanup..." >> "$LOG_FILE"

# Run proof cleanup
cd "$SCRIPT_DIR/.." && node scripts/cleanup-proofs.js >> "$LOG_FILE" 2>&1

# Clean up old log files (keep last 30 days)
find "$SCRIPT_DIR/../logs" -name "cleanup-*.log" -mtime +30 -delete

echo "[$(date)] Cleanup completed" >> "$LOG_FILE"