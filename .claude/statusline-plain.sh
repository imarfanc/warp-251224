#!/bin/bash
# Claude Code Custom Status Line (Plain Text Version)
# =====================================================
# No ANSI colors - works in any terminal
#
# Displays: Model | Context % | Tokens Used/Total | Permission Mode

INPUT=$(cat)

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "[Error: jq not installed]"
    exit 1
fi

# Extract values
MODEL_ID=$(echo "$INPUT" | jq -r '.model.id // "unknown"')
USED_PCT=$(echo "$INPUT" | jq -r '.context_window.used_percentage // 0')
TOTAL_INPUT=$(echo "$INPUT" | jq -r '.context_window.total_input_tokens // 0')
TOTAL_OUTPUT=$(echo "$INPUT" | jq -r '.context_window.total_output_tokens // 0')
CONTEXT_SIZE=$(echo "$INPUT" | jq -r '.context_window.context_window_size // 200000')

TOTAL_USED=$((TOTAL_INPUT + TOTAL_OUTPUT))

# Format model name
case "$MODEL_ID" in
    *opus-4-5*|*opus-4.5*) MODEL_NAME="Opus 4.5" ;;
    *opus-4*) MODEL_NAME="Opus 4" ;;
    *sonnet-4*) MODEL_NAME="Sonnet 4" ;;
    *sonnet-3-5*) MODEL_NAME="Sonnet 3.5" ;;
    *haiku*) MODEL_NAME="Haiku" ;;
    *) MODEL_NAME=$(echo "$INPUT" | jq -r '.model.display_name // "Claude"') ;;
esac

# Format tokens (K suffix)
format_tokens() {
    local t="$1"
    if [[ "$t" -ge 1000 ]]; then
        echo "$t" | awk '{printf "%.0fk", $1/1000}'
    else
        echo "$t"
    fi
}

USED_DISPLAY=$(format_tokens "$TOTAL_USED")
CONTEXT_DISPLAY=$(format_tokens "$CONTEXT_SIZE")

# Get permission mode
PERM_MODE="default"
if [[ -f "$HOME/.claude/settings.json" ]]; then
    PERM_MODE=$(jq -r '.permissions.defaultMode // "default"' "$HOME/.claude/settings.json" 2>/dev/null)
fi

# Map permission mode
case "$PERM_MODE" in
    "bypassPermissions") PERM_DISPLAY="BYPASS ON" ;;
    "acceptEdits") PERM_DISPLAY="auto-edit" ;;
    "plan") PERM_DISPLAY="plan mode" ;;
    "dontAsk") PERM_DISPLAY="deny" ;;
    *) PERM_DISPLAY="default" ;;
esac

# Output
echo "${MODEL_NAME} | ${USED_PCT}% | ${USED_DISPLAY}/${CONTEXT_DISPLAY} tokens | ${PERM_DISPLAY}"
