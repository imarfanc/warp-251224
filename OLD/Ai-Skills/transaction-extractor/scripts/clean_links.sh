#!/bin/bash

# Target file from argument
TARGET_FILE="$1"

if [ -z "$TARGET_FILE" ]; then
    echo "Usage: $0 <target_file>"
    exit 1
fi

if [ ! -f "$TARGET_FILE" ]; then
    echo "Error: File '$TARGET_FILE' not found."
    exit 1
fi

echo "Cleaning order links in $TARGET_FILE..."

# Use perl for in-place replacement as it is more consistent across platforms.
perl -pi -e 's/&ref_=yt_ti_v//g' "$TARGET_FILE"

echo "Done."
