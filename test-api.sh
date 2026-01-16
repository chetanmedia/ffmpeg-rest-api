#!/bin/bash

# Test script for FFmpeg REST API
API_URL="http://localhost:3000"

echo "╔════════════════════════════════════════════╗"
echo "║   FFmpeg REST API - Test Script           ║"
echo "╔════════════════════════════════════════════╗"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to wait for job completion
wait_for_job() {
    local job_id=$1
    echo -e "${BLUE}⏳ Waiting for job to complete...${NC}"
    
    while true; do
        STATUS=$(curl -s "${API_URL}/job/${job_id}")
        STATE=$(echo $STATUS | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        
        echo -e "${YELLOW}   Status: $STATE${NC}"
        
        if [ "$STATE" == "completed" ]; then
            echo -e "${GREEN}✅ Job completed!${NC}"
            echo "$STATUS" | jq .
            return 0
        elif [ "$STATE" == "failed" ]; then
            echo -e "${RED}❌ Job failed!${NC}"
            echo "$STATUS" | jq .
            return 1
        fi
        
        sleep 2
    done
}

# Test 1: Health Check
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}1. Testing Health Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
curl -s "${API_URL}/health" | jq .
echo ""

# Check if user provided a test file
if [ -z "$1" ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📝 Usage Examples:${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "To test with a video file:"
    echo "  ./test-api.sh /path/to/video.mp4"
    echo ""
    echo "To test with an image file:"
    echo "  ./test-api.sh /path/to/image.jpg"
    echo ""
    echo "To test with an audio file:"
    echo "  ./test-api.sh /path/to/audio.mp3"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}2. Creating a Test Video${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "Generating a 5-second test video with FFmpeg..."
    
    # Create a simple test video
    ffmpeg -f lavfi -i testsrc=duration=5:size=320x240:rate=30 \
           -f lavfi -i sine=frequency=1000:duration=5 \
           -pix_fmt yuv420p test-video.mp4 -y &>/dev/null
    
    if [ -f "test-video.mp4" ]; then
        echo -e "${GREEN}✅ Test video created: test-video.mp4${NC}"
        TEST_FILE="test-video.mp4"
    else
        echo -e "${RED}❌ Failed to create test video${NC}"
        exit 1
    fi
else
    TEST_FILE="$1"
    if [ ! -f "$TEST_FILE" ]; then
        echo -e "${RED}❌ File not found: $TEST_FILE${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Using file: $TEST_FILE${NC}"
fi

echo ""

# Test 2: Media Probe
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}3. Testing Media Probe${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
RESPONSE=$(curl -s -X POST "${API_URL}/media/probe" -F "file=@${TEST_FILE}")
JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
echo "Job ID: $JOB_ID"
wait_for_job "$JOB_ID"
echo ""

# Detect file type
if file "$TEST_FILE" | grep -q "video\|Video"; then
    FILE_TYPE="video"
elif file "$TEST_FILE" | grep -q "image\|Image"; then
    FILE_TYPE="image"
elif file "$TEST_FILE" | grep -q "audio\|Audio"; then
    FILE_TYPE="audio"
else
    FILE_TYPE="unknown"
fi

# Test based on file type
if [ "$FILE_TYPE" == "video" ]; then
    # Test 3: Video Conversion
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}4. Testing Video Conversion${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    RESPONSE=$(curl -s -X POST "${API_URL}/video/convert" \
        -F "file=@${TEST_FILE}" \
        -F 'options={"videoBitrate":"500k","resolution":"640x480"}')
    JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
    echo "Job ID: $JOB_ID"
    
    if wait_for_job "$JOB_ID"; then
        echo -e "${BLUE}📥 Downloading result...${NC}"
        curl -s "${API_URL}/job/${JOB_ID}/result" -o "output-converted.mp4"
        if [ -f "output-converted.mp4" ]; then
            SIZE=$(ls -lh output-converted.mp4 | awk '{print $5}')
            echo -e "${GREEN}✅ Downloaded: output-converted.mp4 (${SIZE})${NC}"
        fi
    fi
    echo ""
    
    # Test 4: Audio Extraction
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}5. Testing Audio Extraction${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    RESPONSE=$(curl -s -X POST "${API_URL}/audio/extract" \
        -F "file=@${TEST_FILE}" \
        -F 'options={"channels":2}')
    JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
    echo "Job ID: $JOB_ID"
    
    if wait_for_job "$JOB_ID"; then
        echo -e "${BLUE}📥 Downloading result...${NC}"
        curl -s "${API_URL}/job/${JOB_ID}/result" -o "output-audio.mp3"
        if [ -f "output-audio.mp3" ]; then
            SIZE=$(ls -lh output-audio.mp3 | awk '{print $5}')
            echo -e "${GREEN}✅ Downloaded: output-audio.mp3 (${SIZE})${NC}"
        fi
    fi
    echo ""
    
    # Test 5: Frame Extraction
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}6. Testing Frame Extraction${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    RESPONSE=$(curl -s -X POST "${API_URL}/video/frames" \
        -F "file=@${TEST_FILE}" \
        -F 'options={"timestamp":"00:00:01"}')
    JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
    echo "Job ID: $JOB_ID"
    
    if wait_for_job "$JOB_ID"; then
        echo -e "${BLUE}📥 Downloading result...${NC}"
        curl -s "${API_URL}/job/${JOB_ID}/result" -o "output-frame.jpg"
        if [ -f "output-frame.jpg" ]; then
            SIZE=$(ls -lh output-frame.jpg | awk '{print $5}')
            echo -e "${GREEN}✅ Downloaded: output-frame.jpg (${SIZE})${NC}"
        fi
    fi
    echo ""

elif [ "$FILE_TYPE" == "image" ]; then
    # Test: Image Conversion
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}4. Testing Image Conversion${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    RESPONSE=$(curl -s -X POST "${API_URL}/image/convert" \
        -F "file=@${TEST_FILE}" \
        -F 'options={"quality":2}')
    JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
    echo "Job ID: $JOB_ID"
    
    if wait_for_job "$JOB_ID"; then
        echo -e "${BLUE}📥 Downloading result...${NC}"
        curl -s "${API_URL}/job/${JOB_ID}/result" -o "output-image.jpg"
        if [ -f "output-image.jpg" ]; then
            SIZE=$(ls -lh output-image.jpg | awk '{print $5}')
            echo -e "${GREEN}✅ Downloaded: output-image.jpg (${SIZE})${NC}"
        fi
    fi
    echo ""

elif [ "$FILE_TYPE" == "audio" ]; then
    # Test: Audio Conversion
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}4. Testing Audio Conversion${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    RESPONSE=$(curl -s -X POST "${API_URL}/audio/convert" \
        -F "file=@${TEST_FILE}" \
        -F 'options={"format":"mp3","bitrate":"192k"}')
    JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
    echo "Job ID: $JOB_ID"
    
    if wait_for_job "$JOB_ID"; then
        echo -e "${BLUE}📥 Downloading result...${NC}"
        curl -s "${API_URL}/job/${JOB_ID}/result" -o "output-converted.mp3"
        if [ -f "output-converted.mp3" ]; then
            SIZE=$(ls -lh output-converted.mp3 | awk '{print $5}')
            echo -e "${GREEN}✅ Downloaded: output-converted.mp3 (${SIZE})${NC}"
        fi
    fi
    echo ""
fi

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All tests completed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Generated files:"
ls -lh output-* test-video.mp4 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""
