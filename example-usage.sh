#!/bin/bash

# Example usage script for FFmpeg REST API
# Make sure the API server is running before executing these commands

API_URL="http://localhost:3000"

echo "=== FFmpeg REST API Example Usage ==="
echo ""

# Health check
echo "1. Health Check:"
curl -s "${API_URL}/health" | jq .
echo ""
echo ""

# Note: The following examples assume you have test media files
# You'll need to replace the file paths with actual files

# Example 1: Convert video to MP4
if [ -f "test-video.avi" ]; then
  echo "2. Converting video to MP4..."
  RESPONSE=$(curl -s -X POST "${API_URL}/video/convert" \
    -F "file=@test-video.avi" \
    -F 'options={"videoBitrate":"1000k","resolution":"1280x720"}')
  
  echo $RESPONSE | jq .
  JOB_ID=$(echo $RESPONSE | jq -r '.jobId')
  
  echo "Job ID: $JOB_ID"
  echo "Waiting for job to complete..."
  
  while true; do
    STATUS=$(curl -s "${API_URL}/job/${JOB_ID}")
    STATE=$(echo $STATUS | jq -r '.status')
    
    echo "Status: $STATE"
    
    if [ "$STATE" == "completed" ] || [ "$STATE" == "failed" ]; then
      echo $STATUS | jq .
      break
    fi
    
    sleep 2
  done
  
  # Download result (stateless mode)
  if [ "$STATE" == "completed" ]; then
    echo "Downloading result..."
    curl -s "${API_URL}/job/${JOB_ID}/result" -o output.mp4
    echo "Downloaded to output.mp4"
  fi
  
  echo ""
fi

# Example 2: Extract audio from video
if [ -f "test-video.mp4" ]; then
  echo "3. Extracting audio from video..."
  RESPONSE=$(curl -s -X POST "${API_URL}/audio/extract" \
    -F "file=@test-video.mp4" \
    -F 'options={"channels":2}')
  
  echo $RESPONSE | jq .
  echo ""
fi

# Example 3: Extract frames from video
if [ -f "test-video.mp4" ]; then
  echo "4. Extracting frames from video..."
  RESPONSE=$(curl -s -X POST "${API_URL}/video/frames" \
    -F "file=@test-video.mp4" \
    -F 'options={"count":5}')
  
  echo $RESPONSE | jq .
  echo ""
fi

# Example 4: Convert audio to MP3
if [ -f "test-audio.wav" ]; then
  echo "5. Converting audio to MP3..."
  RESPONSE=$(curl -s -X POST "${API_URL}/audio/convert" \
    -F "file=@test-audio.wav" \
    -F 'options={"format":"mp3","bitrate":"192k"}')
  
  echo $RESPONSE | jq .
  echo ""
fi

# Example 5: Convert image to JPG
if [ -f "test-image.png" ]; then
  echo "6. Converting image to JPG..."
  RESPONSE=$(curl -s -X POST "${API_URL}/image/convert" \
    -F "file=@test-image.png" \
    -F 'options={"quality":2}')
  
  echo $RESPONSE | jq .
  echo ""
fi

# Example 6: Probe media file
if [ -f "test-video.mp4" ]; then
  echo "7. Probing media file..."
  RESPONSE=$(curl -s -X POST "${API_URL}/media/probe" \
    -F "file=@test-video.mp4")
  
  echo $RESPONSE | jq .
  JOB_ID=$(echo $RESPONSE | jq -r '.jobId')
  
  # Wait for completion and get metadata
  sleep 3
  STATUS=$(curl -s "${API_URL}/job/${JOB_ID}")
  echo "Metadata:"
  echo $STATUS | jq '.result.metadata'
  echo ""
fi

echo ""
echo "=== OpenAPI Documentation ==="
echo "View full API documentation at: ${API_URL}/openapi.json"
echo ""
