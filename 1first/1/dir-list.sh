#!/usr/bin/env bash

#
# SCRIPT: list_dirs_and_files.sh
# PURPOSE:
#   • Snapshot the current directory’s structure into a single file.
#   • Section 0: Show statistics (total folders and files).
#   • Section 1: List immediate subdirectories (“FOLDERS ONLY”).
#   • Section 2: Append a full recursive listing (files + folders).
#   • Print an initial ETA message (in blue).
#   • Print a final confirmation message (in green).
#   • Save into: {EXPORT_DIR}/SNAP-{basename_of_dir}-(yy.m.d-h.m).txt
#
#   – EXPORT_DIR: where to write the output (default: "$HOME/Desktop")
#   – basename_of_dir: name of the current directory.
#   – yy: two-digit year (e.g., 25 for 2025).
#   – m: month without leading zero (e.g., 6 for June).
#   – d: day without leading zero (e.g., 3).
#   – h: hour (24h) without leading zero if <10.
#   – m: minute with leading zero if <10.
#
#   Example output file:
#     ~/Desktop/SNAP-Developer-(25.6.3-13.05).txt
#
# DEPENDENCIES:
#   • BSD-compatible date (macOS default).
#   • sed (for stripping leading zeros).
#   • find, awk, sort (standard Unix utilities).
#   • ANSI escape support in the terminal.
#
# AUTHOR:       Your Name
# DATE:         2025-06-03
#

# —————————————————————————————————————————————————————————————
# 0. CONFIGURATION: Set where the snapshot file should be saved.
#    By default, this points to "$HOME/Desktop". You may change it.
# —————————————————————————————————————————————————————————————
EXPORT_DIR="$HOME/Developer/init-macOS"

# Ensure EXPORT_DIR exists (create if necessary)
if [[ ! -d "$EXPORT_DIR" ]]; then
  mkdir -p "$EXPORT_DIR" || {
    echo "Error: Could not create directory '$EXPORT_DIR'." >&2
    exit 1
  }
fi

# —————————————————————————————————————————————————————————————
# 1. DECLARE COLOR VARIABLES (PINK | PURPLE | BLUE | GREEN | RED | NC)
# —————————————————————————————————————————————————————————————
PINK='\033[38;5;200m'      # A pink shade (256-color palette)
PURPLE='\033[38;5;93m'     # A purple shade
BLUE='\033[38;5;75m'       # A blue shade
GREEN='\033[0;32m'         # Standard ANSI green
RED='\033[0;31m'           # Standard ANSI red
NC='\033[0m'               # No Color / reset sequence

# —————————————————————————————————————————————————————————————
# 2. INITIAL MESSAGE: Print ETA (in BLUE)
# —————————————————————————————————————————————————————————————
echo -e "${BLUE}ETA: ~15 sec.${NC}"

# —————————————————————————————————————————————————————————————
# 3. COMPUTE TOTAL NUMBER OF FOLDERS & FILES (using two find commands)
# —————————————————————————————————————————————————————————————
# Ignore patterns: node_modules, .git, .venv, __pycache__, .DS_Store
total_folders=$(
  find . \
    \( -path "./node_modules" -o -path "*/node_modules" -o -path "./.git" -o -path "*/.git" -o -path "./.venv" -o -path "*/.venv" -o -path "*/__pycache__" -o -name ".DS_Store" \) -prune \
    -o -type d -print \
  | wc -l
)
total_files=$(
  find . \
    \( -path "./node_modules" -o -path "*/node_modules" -o -path "./.git" -o -path "*/.git" -o -path "./.venv" -o -path "*/.venv" -o -path "*/__pycache__" -o -name ".DS_Store" \) -prune \
    -o -type f -print \
  | wc -l
)

# —————————————————————————————————————————————————————————————
# 3a. COMPUTE ADDITIONAL STATISTICS: created timestamp, directory size, largest file
# —————————————————————————————————————————————————————————————
created_on="$(date '+%Y-%m-%d %H:%M:%S')"
dir_full_path="$PWD"
# Compute total size of this directory (human-readable)
total_size="$(du -sh "$dir_full_path" 2>/dev/null | awk '{print $1}')"
# Find largest file (ignoring pruned patterns)
largest_info="$(
  find . \
    \( -path "./node_modules" -o -path "*/node_modules" -o -path "./.git" -o -path "*/.git" -o -path "./.venv" -o -path "*/.venv" -o -path "*/__pycache__" -o -name ".DS_Store" \) -prune \
    -o -type f -print0 \
  | xargs -0 du 2>/dev/null \
  | sort -n \
  | tail -1
)"
largest_file_size="$(echo "$largest_info" | awk '{print $1}')"
largest_file_path="$(echo "$largest_info" | awk '{print $2}')"

# —————————————————————————————————————————————————————————————
# 4. EXTRACT BASE DIRECTORY NAME
#    (e.g., if PWD=/Users/you/Developer, dir_name="Developer")
# —————————————————————————————————————————————————————————————
dir_name="$(basename "$PWD")"

# —————————————————————————————————————————————————————————————
# 5. GENERATE RAW TIMESTAMP (TWO-DIGIT FORMAT)
#    BSD date on macOS: "yy.mm.dd-HH.MM" (e.g., "25.06.03-13.05")
# —————————————————————————————————————————————————————————————
raw_ts="$(date +'%y.%m.%d-%H.%M')"

# —————————————————————————————————————————————————————————————
# 6. NORMALIZE TIMESTAMP (STRIP LEADING ZEROS FROM MONTH & DAY)
#    e.g., "25.06.03-13.05" → "25.6.3-13.05"
#    Uses a pair of sed commands to remove “0” when month/day < 10.  [oai_citation:2‡discussions.apple.com](https://discussions.apple.com/thread/251141097?utm_source=chatgpt.com) [oai_citation:3‡apple.stackexchange.com](https://apple.stackexchange.com/questions/398952/how-to-identify-the-largest-files-in-a-directory-including-in-its-subdirectories?utm_source=chatgpt.com)
# —————————————————————————————————————————————————————————————
timestamp="$(echo "$raw_ts" \
  | sed -E 's/^([0-9]{2})\.0([1-9])\./\1.\2./' \
  | sed -E 's/^([0-9]{2}\.[0-9]{1,2})\.0([1-9])-/\1.\2-/')"  

# —————————————————————————————————————————————————————————————
# 7. BUILD OUTPUT FILENAME
#    Format: SNAP-{dir_name}-(timestamp).txt
#    e.g., SNAP-Developer-(25.6.3-13.05).txt
# —————————————————————————————————————————————————————————————
out_file="SNAP-${dir_name}-(${timestamp}).txt"
full_path="$EXPORT_DIR/$out_file"

# Validate that filename is not empty
if [[ -z "$out_file" ]]; then
  echo -e "${RED}Error: Generated filename is empty or invalid.${NC}" >&2
  exit 1
fi

# —————————————————————————————————————————————————————————————
# 8. WRITE “STATISTICS” AND “FOLDERS ONLY” SECTION
#    • Decorative headers
#    • STATISTICS: total_folders, total_files
#    • FOLDERS ONLY: immediate subdirectories at maxdepth 1
# —————————————————————————————————————————————————————————————
{
  echo "╭────────────────────────────────────────────────────────╮"
  echo "|  STATISTICS FOR '$dir_name'                            |"
  echo "╰────────────────────────────────────────────────────────╯"
  echo "  Created on:      $created_on"
  echo "  Directory path:  $dir_full_path"
  echo "  Total size:      $total_size"
  echo "  Largest file:    $largest_file_size  $largest_file_path"
  echo "  Total folders:   $total_folders"
  echo "  Total files:     $total_files"
  echo ""
  echo "╭────────────────────────────────────────────────────────╮"
  echo "|  FOLDERS IN '$dir_name' (Immediate Subdirectories)     |"
  echo "╰────────────────────────────────────────────────────────╯"
  # List of folders (strip leading "./"; exclude "." itself)
  find . -maxdepth 1 -type d \
    | sed 's|^\./||' \
    | grep -v '^$' \
    | sort
  echo ""
} > "$full_path" || {
  echo -e "${RED}Error: Could not write 'STATISTICS/FOLDERS ONLY' section to '$full_path'.${NC}" >&2
  exit 1
}

# —————————————————————————————————————————————————————————————
# 9. APPEND “RECURSIVE LISTING” SECTION
#    • Decorative header
#    • Full recursive list (files + folders, including hidden)
# —————————————————————————————————————————————————————————————
{
  echo "╭────────────────────────────────────────────────────────╮"
  echo "|  FULL RECURSIVE LISTING OF '$dir_name'                 |"
  echo "╰────────────────────────────────────────────────────────╯"
  find . \
    \( -path "./node_modules" -o -path "*/node_modules" -o -path "./.git" -o -path "*/.git" -o -path "./.venv" -o -path "*/.venv" -o -path "*/__pycache__" -o -name ".DS_Store" \) -prune \
    -o -mindepth 1 -print \
  | sed 's|^\./||' \
  | sort \
  | awk -F'/' '
    {
      root = $1
      if (root != prev) {
        if (prev != "") print "────────────────────────────────────────────────────────────────────"
        prev = root
      }
      indent = (NF-1)*4
      printf "%*s%s\n", indent, "", $0
    }
  '
} >> "$full_path" || {
  echo -e "${RED}Error: Could not append 'RECURSIVE LISTING' to '$full_path'.${NC}" >&2
  exit 1
}

# —————————————————————————————————————————————————————————————
# 10. FINAL CONFIRMATION: Print “Saved snapshot to:” in GREEN
# —————————————————————————————————————————————————————————————
echo -e "${GREEN}Saved snapshot to: $full_path${NC}"