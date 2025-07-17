#!/bin/bash

# Setup script for automated log rotation cron job

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_ROTATION_SCRIPT="$PROJECT_DIR/scripts/log-rotation.js"

echo "Setting up log rotation cron job..."

# Create a cron entry that runs daily at 2 AM
CRON_ENTRY="0 2 * * * cd $PROJECT_DIR && /usr/bin/node $LOG_ROTATION_SCRIPT >> $PROJECT_DIR/logs/rotation.log 2>&1"

# Check if cron entry already exists
if crontab -l 2>/dev/null | grep -q "log-rotation.js"; then
    echo "Log rotation cron job already exists."
else
    # Add the cron entry
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
    echo "Added cron job: $CRON_ENTRY"
fi

echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove the cron job: crontab -e (then delete the line)"
echo ""
echo "You can also run log rotation manually with: node scripts/log-rotation.js"