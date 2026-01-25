#!/bin/bash
# Claude Code Custom Status Line
# ===============================
# Displays: Model | Context % | Tokens Used/Total | Permission Mode
#
# This script receives JSON data from Claude Code via stdin and outputs
# a formatted single-line status bar.
#
# Install: Add to ~/.claude/settings.json:
#   "statusLine": { "type": "command", "command": "~/.claude/statusline.sh" }

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
# Set to 1 to enable colors, 0 for plain text
USE_COLORS=1

# ANSI color codes (subtle, terminal-friendly)
if [[ "$USE_COLORS" -eq 1 ]]; then
    RESET="\033[0m"
    DIM="\033[2m"
    CYAN="\033[36m"
    GREEN="\033[32m"
    YELLOW="\033[33m"
    RED="\033[31m"
    MAGENTA="\033[35m"
else
    RESET=""
    DIM=""
    CYAN=""
    GREEN=""
    YELLOW=""
    RED=""
    MAGENTA=""
fi

# -----------------------------------------------------------------------------
# Read JSON input from Claude Code
# -----------------------------------------------------------------------------
INPUT=$(cat)

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "[Error: jq not installed]"
    exit 1
fi

# -----------------------------------------------------------------------------
# Extract values from JSON (all exact values from Claude Code)
# -----------------------------------------------------------------------------
# Model information
MODEL_ID=$(echo "$INPUT" | jq -r '.model.id // "unknown"')
MODEL_DISPLAY=$(echo "$INPUT" | jq -r '.model.display_name // "Unknown"')

# Context window metrics (exact values)
USED_PCT=$(echo "$INPUT" | jq -r '.context_window.used_percentage // 0')
TOTAL_INPUT=$(echo "$INPUT" | jq -r '.context_window.total_input_tokens // 0')
TOTAL_OUTPUT=$(echo "$INPUT" | jq -r '.context_window.total_output_tokens // 0')
CONTEXT_SIZE=$(echo "$INPUT" | jq -r '.context_window.context_window_size // 200000')

# Calculate total used tokens
TOTAL_USED=$((TOTAL_INPUT + TOTAL_OUTPUT))

# -----------------------------------------------------------------------------
# Format model name (extract version if present)
# -----------------------------------------------------------------------------
# Map model IDs to friendly names
format_model_name() {
    local model_id="$1"
    local display="$2"

    case "$model_id" in
        *opus-4-5*|*opus-4.5*)
            echo "Opus 4.5"
            ;;
        *opus-4-1*|*opus-4.1*|*opus-4*)
            echo "Opus 4"
            ;;
        *sonnet-4*|*sonnet4*)
            echo "Sonnet 4"
            ;;
        *sonnet-3-5*|*sonnet-3.5*)
            echo "Sonnet 3.5"
            ;;
        *haiku*)
            echo "Haiku"
            ;;
        *)
            # Fall back to display name or cleaned model ID
            if [[ "$display" != "null" && -n "$display" ]]; then
                echo "$display"
            else
                echo "$model_id" | sed 's/claude-//' | sed 's/-/ /g'
            fi
            ;;
    esac
}

MODEL_NAME=$(format_model_name "$MODEL_ID" "$MODEL_DISPLAY")

# -----------------------------------------------------------------------------
# Format token counts (human readable with K suffix)
# -----------------------------------------------------------------------------
format_tokens() {
    local tokens="$1"
    if [[ "$tokens" -ge 1000 ]]; then
        # Use awk for proper rounding
        echo "$tokens" | awk '{printf "%.0fk", $1/1000}'
    else
        echo "$tokens"
    fi
}

USED_DISPLAY=$(format_tokens "$TOTAL_USED")
CONTEXT_DISPLAY=$(format_tokens "$CONTEXT_SIZE")

# -----------------------------------------------------------------------------
# Get permission mode (exact value from settings file)
# -----------------------------------------------------------------------------
get_permission_mode() {
    local settings_file="$HOME/.claude/settings.json"
    local mode="default"

    if [[ -f "$settings_file" ]]; then
        mode=$(jq -r '.permissions.defaultMode // "default"' "$settings_file" 2>/dev/null)
    fi

    echo "$mode"
}

PERM_MODE=$(get_permission_mode)

# Map permission mode to display text
format_permission_mode() {
    local mode="$1"

    case "$mode" in
        "bypassPermissions")
            echo -e "${RED}bypass on${RESET}"
            ;;
        "acceptEdits")
            echo -e "${GREEN}auto-edit${RESET}"
            ;;
        "plan")
            echo -e "${CYAN}plan mode${RESET}"
            ;;
        "dontAsk")
            echo -e "${YELLOW}deny${RESET}"
            ;;
        *)
            echo -e "${DIM}default${RESET}"
            ;;
    esac
}

PERM_DISPLAY=$(format_permission_mode "$PERM_MODE")

# -----------------------------------------------------------------------------
# Color the context percentage based on usage level
# -----------------------------------------------------------------------------
color_percentage() {
    local pct="$1"
    local pct_int="${pct%.*}"  # Remove decimal

    if [[ "$pct_int" -lt 50 ]]; then
        echo -e "${GREEN}${pct}%${RESET}"
    elif [[ "$pct_int" -lt 75 ]]; then
        echo -e "${YELLOW}${pct}%${RESET}"
    else
        echo -e "${RED}${pct}%${RESET}"
    fi
}

PCT_DISPLAY=$(color_percentage "$USED_PCT")

# -----------------------------------------------------------------------------
# Build and output the status line
# -----------------------------------------------------------------------------
# Format: Model | Context% | Used/Total tokens | Permission Mode
#
# Example output:
# Opus 4.5 | 24% | 49k/200k tokens | auto-edit

SEPARATOR="${DIM}|${RESET}"

echo -e "${MAGENTA}${MODEL_NAME}${RESET} ${SEPARATOR} ${PCT_DISPLAY} ${SEPARATOR} ${DIM}${USED_DISPLAY}/${CONTEXT_DISPLAY} tokens${RESET} ${SEPARATOR} ${PERM_DISPLAY}"
