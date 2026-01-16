#!/bin/bash

VIDEO_PATH="/Users/chetan/railway ffmpeg/AQPC7gQaYVNKIAAL1kI-GG4WjnoVwS6h--9R2XUsyFTGin3s0XdC1NDY3BYtzJ3UJ6rwOBAQiMrXOD566ljNVigzaboORFI8xpq3Buc.mp4"
API_URL="http://localhost:3000"
OUTPUT_DIR="extracted_frames"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Extracting Frames Every 3 Seconds       ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Get video duration
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_PATH")
DURATION_INT=$(printf "%.0f" $DURATION)

echo -e "${GREEN}📹 Video Duration: ${DURATION_INT} seconds${NC}"
echo -e "${GREEN}📸 Extracting frames every 3 seconds...${NC}"
echo ""

# Function to wait for job and download
extract_frame() {
    local timestamp=$1
    local frame_num=$2
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Frame $frame_num: ${timestamp}${NC}"
    
    # Submit job
    RESPONSE=$(curl -s -X POST "${API_URL}/video/frames" \
        -F "file=@${VIDEO_PATH}" \
        -F "options={\"timestamp\":\"${timestamp}\"}")
    
    JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$JOB_ID" ]; then
        echo -e "${RED}❌ Failed to submit job${NC}"
        echo "$RESPONSE"
        return 1
    fi
    
    echo "   Job ID: $JOB_ID"
    echo -n "   Status: "
    
    # Wait for completion
    while true; do
        STATUS=$(curl -s "${API_URL}/job/${JOB_ID}")
        STATE=$(echo $STATUS | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        
        if [ "$STATE" == "completed" ]; then
            echo -e "${GREEN}✅ Completed${NC}"
            
            # Download the frame
            OUTPUT_FILE="${OUTPUT_DIR}/frame_${frame_num}_at_${timestamp//:/-}.jpg"
            curl -s "${API_URL}/job/${JOB_ID}/result" -o "$OUTPUT_FILE"
            
            if [ -f "$OUTPUT_FILE" ]; then
                SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
                echo -e "   ${GREEN}📥 Saved: $(basename $OUTPUT_FILE) (${SIZE})${NC}"
            fi
            return 0
        elif [ "$STATE" == "failed" ]; then
            echo -e "${RED}❌ Failed${NC}"
            echo "$STATUS" | jq .
            return 1
        fi
        
        echo -n "."
        sleep 1
    done
}

# Extract frames at 3-second intervals
frame_num=1
for seconds in $(seq 0 3 $DURATION_INT); do
    # Format timestamp as HH:MM:SS
    hours=$((seconds / 3600))
    minutes=$(((seconds % 3600) / 60))
    secs=$((seconds % 60))
    timestamp=$(printf "%02d:%02d:%02d" $hours $minutes $secs)
    
    extract_frame "$timestamp" $frame_num
    frame_num=$((frame_num + 1))
    echo ""
done

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ All Frames Extracted Successfully!   ║${NC}"
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo ""
echo -e "${BLUE}📁 Frames saved to: ${OUTPUT_DIR}/${NC}"
echo ""
ls -lh "$OUTPUT_DIR" | tail -n +2 | awk '{print "   " $9 " (" $5 ")"}'
echo ""
echo -e "${YELLOW}💡 Tip: Open the frames with:${NC}"
echo "   open ${OUTPUT_DIR}"
echo ""
