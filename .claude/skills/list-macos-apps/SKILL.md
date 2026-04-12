---
name: list-macos-apps
description: "Manage open macOS applications. Use when the user wants to list open/running apps, quit or close specific apps, quit all apps except one, or close windows (e.g. Finder windows). Triggers: 'list open apps', 'list apps', 'what\\'s running', 'quit all except X', 'close all apps', 'close finder windows', 'kill X', 'show running applications'."
---

# macOS App Manager

## List Open Apps

Run the bundled script — it filters to user-facing `/Applications/` processes only and skips helpers/XPC sub-processes. Outputs **tables**: GUI apps (Dock-based), menubar apps (LSUIElement = 1), and widgets, each with emoji icons:

```bash
uv run --with rich scripts/list_apps.py
```

Present the output directly — the script renders rich tables with icons.

## Quit Apps

**Preferred — AppleScript (handles save dialogs gracefully):**
```bash
osascript -e 'tell application "App Name" to quit'
```

Quit multiple at once:
```bash
osascript -e '
tell application "Firefox" to quit
tell application "Zen" to quit
tell application "Notes" to quit
'
```

**Fallback — killall (no save dialog):**
```bash
killall "App Name"
killall "Google Chrome" "Cursor" "Zed" "Slack"
```

**Force quit (last resort):**
```bash
killall -9 "App Name"
kill -9 <pid>
```

**Quit all except one** — run list_apps.py, exclude the named app, then quit the rest. Verify with `ps aux | grep "App Name" | grep -v grep`.

## Quitting Widgets / System Apps

The script's **Widgets** table shows system apps (e.g. VoiceMemos, App Store, Notes, Messages, FindMy, iPhone Mirroring, Shortcuts). These don't respond to `killall` — use AppleScript:

```bash
osascript -e '
tell application "VoiceMemos" to quit
tell application "App Store" to quit
tell application "Notes" to quit
tell application "Messages" to quit
tell application "FindMy" to quit
tell application "iPhone Mirroring" to quit
tell application "Shortcuts" to quit
'
```

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
- **Zen browser**: Use AppleScript (`tell application "Zen" to quit`) — `killall "Zen"` is unreliable.
- **Widget/system apps** (VoiceMemos, Notes, Messages, FindMy, App Store, iPhone Mirroring, Shortcuts): Only respond to AppleScript quit, not `killall`.
