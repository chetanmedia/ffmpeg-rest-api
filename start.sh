#!/bin/sh
set -e

echo "Starting FFmpeg REST API..."
echo "Storage mode: ${STORAGE_MODE:-stateless}"

# Start worker in background and log its output
echo "Starting worker process..."
node dist/worker.js 2>&1 &
WORKER_PID=$!
echo "Worker PID: $WORKER_PID"

# Give worker a moment to start
sleep 2

# Start API server in foreground
echo "Starting API server..."
node dist/index.js
