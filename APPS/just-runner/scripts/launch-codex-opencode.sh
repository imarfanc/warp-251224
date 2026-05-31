#!/usr/bin/env bash
# Interactive Codex needs a real TTY; just-runner only pipes stdout/stderr.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CODEX_CMD='codex -m "gpt-5.4-mini" -c '"'"'model_reasoning_effort="medium"'"'"' '"'"'open [@cmux](plugin://computer-use@openai-bundled) and run `opencode`'"'"''

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Interactive Codex must run in a terminal; macOS Terminal launch is not available on this OS."
  exit 1
fi

osascript - "$REPO_ROOT" "$CODEX_CMD" <<'APPLESCRIPT'
on run argv
  set repoRoot to item 1 of argv
  set shellCmd to item 2 of argv
  tell application "Terminal"
    activate
    do script "cd " & quoted form of repoRoot & " && " & shellCmd
  end tell
end run
APPLESCRIPT

echo "Launched Codex in Terminal.app (repo: $REPO_ROOT)"
