#!/bin/bash
set -e

echo "Setting env"
CMD=$1
PRESET=$2
BUCKET=$3
SEGMENT=$4
VIDEO_ID=$5
AWS_ACCESS_KEY_ID=$6
AWS_SECRET_ACCESS_KEY=$7

TMP_DIR=$(mktemp -d)
VIDEO_OUTPUT_PATH="${TMP_DIR}/${SEGMENT}-transcoded.mkv"

echo "Creating rclone config"
mkdir -p /root/.config/rclone
cat > /root/.config/rclone/rclone.conf <<EOL
[do]
type = s3
provider = DigitalOcean
env_auth = false
access_key_id = $AWS_ACCESS_KEY_ID
secret_access_key = $AWS_SECRET_ACCESS_KEY
endpoint = nyc3.digitaloceanspaces.com
acl = private
EOL

echo "Downloading segment"
rclone copy do:$BUCKET/segments/$VIDEO_ID/$SEGMENT $TMP_DIR

echo "Transcoding segment"
ffmpeg -i $VIDEO_INPUT_PATH -c:v libx264 -crf 22 -preset ultrafast -threads 1 $VIDEO_OUTPUT_PATH

echo "Uploading segment"
rclone copy "${TMP_DIR}/${SEGMENT}" do:$BUCKET/transcoded-segments/$VIDEO_ID/$PRESET
