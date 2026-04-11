---
name: list-macos-apps
description: "Manage open macOS applications. Use when the user wants to list open/running apps, quit or close specific apps, quit all apps except one, or close windows (e.g. Finder windows). Triggers: 'list open apps', 'list apps', 'what\\'s running', 'quit all except X', 'close all apps', 'close finder windows', 'kill X', 'show running applications'."
---

# macOS App Manager

## List Open Apps

Run the bundled script — it filters to user-facing `/Applications/` processes only and skips helpers/XPC sub-processes. Outputs **two tables**: GUI apps (Dock-based) and menubar apps (LSUIElement = 1), each with emoji icons:

```bash
uv run scripts/list_apps.py
```

Present the output directly — the script renders rich tables with icons.

## Quit Apps

**Graceful quit (preferred):**
```bash
killall "App Name"
```

**Force quit (if graceful fails):**
```bash
killall -9 "App Name"
# or by PID
kill -9 <pid>
```

**Quit multiple apps at once:**
```bash
killall "Google Chrome" "Cursor" "Zed" "Slack"
```

**Quit all except one** — run list_apps.py, exclude the named app, then killall the rest in one command. Verify with `ps aux | grep "App Name" | grep -v grep`. If still running, escalate to `kill -9` by PID.

## Close Windows (Without Quitting)

Use AppleScript for apps that support it (e.g. Finder, Safari):

```bash
osascript -e 'tell application "Finder" to close every window'
osascript -e 'tell application "Safari" to close every window'
```

## Notes

- `Finder`, `Dock`, `WindowServer`, `loginwindow` are macOS essentials — avoid quitting unless explicitly asked.
- **Keyboard Maestro**: `killall "Keyboard Maestro"` won't stop its engine — also run `killall "Keyboard Maestro Engine"`.
- **BetterTouchTool**: May relaunch via `BTTRelaunch` — kill both: `killall BTTRelaunch BetterTouchTool`.
- **Setapp**: Manages sub-apps — quitting the parent cleans up children.
