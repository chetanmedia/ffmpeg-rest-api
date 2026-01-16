#!/bin/sh

# Start worker in background
node dist/worker.js &
WORKER_PID=$!

# Start API server in foreground
node dist/index.js &
API_PID=$!

# Wait for both processes
wait $WORKER_PID $API_PID
