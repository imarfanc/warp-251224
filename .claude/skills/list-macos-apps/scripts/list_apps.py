#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["rich"]
# ///
"""List open macOS apps in three tables: GUI, menubar, and widgets."""

import json
import os
import re
import subprocess
from collections import defaultdict

from rich.console import Console
from rich.table import Table

# Apps that behave as menubar-only at runtime (setActivationPolicy .accessory)
# but do NOT set LSUIElement=1 in their Info.plist.
RUNTIME_MENUBAR_APPS: set[str] = {
    'Paste',
    'Setapp',
    'Shottr',
    'VoiceInk',
}

# Apps with a separate background engine executable nested inside the main bundle.
# Maps app_name → set of exe names that indicate the engine/menubar-only mode.
# When ONLY these exes are running → menubar; when the main exe also runs → GUI.
ENGINE_ONLY_EXECUTABLES: dict[str, set[str]] = {
    'Keyboard Maestro': {'Keyboard Maestro Engine'},
}

APP_ICONS: dict[str, str] = {
    'Alfred': '🔍',
    'Amphetamine': '💊',
    'Arc': '🌐',
    'Bartender': '🍸',
    'BetterTouchTool': '🖱️',
    'Calendar': '📅',
    'CleanMyMac': '🧹',
    'CleanShot X': '📸',
    'Cursor': '💻',
    'Discord': '🎮',
    'Figma': '🎨',
    'Finder': '📁',
    'Google Chrome': '🌐',
    'iStat Menus': '📊',
    'Keyboard Maestro': '⌨️',
    'Lungo': '☕',
    'Mail': '📧',
    'Messages': '💬',
    'MonitorControl': '🔆',
    'Notes': '📝',
    'Notion': '📋',
    'PopClip': '✂️',
    'Raycast': '🔍',
    'Safari': '🌐',
    'Setapp': '📦',
    'Shottr': '📸',
    'Slack': '💼',
    'Spotify': '🎵',
    'Stats': '📊',
    'Terminal': '💻',
    'Tot': '✏️',
    'VoiceInk': '🎙️',
    'Warp': '⚡',
    'Weather': '🌤️',
    'WhatsApp': '💬',
    'Xcode': '🔨',
    'Zed': '⚡',
    'Zoom': '📹',
}


def get_icon(app_name: str) -> str:
    if app_name in APP_ICONS:
        return APP_ICONS[app_name]
    for key, icon in APP_ICONS.items():
        if key.lower() in app_name.lower() or app_name.lower() in key.lower():
            return icon
    return '📱'


def is_menubar_app(app_name: str) -> bool:
    """Return True if the app is a menubar-only app (plist flag or known runtime list)."""
    if app_name in RUNTIME_MENUBAR_APPS:
        return True
    candidates = [
        f'/Applications/{app_name}.app/Contents/Info.plist',
        f'/Applications/Setapp/{app_name}.app/Contents/Info.plist',
        os.path.expanduser(f'~/Applications/{app_name}.app/Contents/Info.plist'),
    ]
    for plist in candidates:
        if not os.path.exists(plist):
            continue
        try:
            r = subprocess.run(
                ['plutil', '-convert', 'json', '-o', '-', plist],
                capture_output=True, text=True, timeout=2,
            )
            if r.returncode == 0:
                data = json.loads(r.stdout)
                truthy = (1, '1', True, 'YES', 'Yes')
                if data.get('LSUIElement') in truthy or data.get('LSBackgroundOnly') in truthy:
                    return True
        except Exception:
            pass
    return False


# ── Collect processes ─────────────────────────────────────────────────────────
result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
processes = result.stdout.split('\n')[1:]

user_apps: dict[str, list[dict]] = defaultdict(list)   # /Applications/
widget_apps: dict[str, list[dict]] = defaultdict(list) # /System/Applications/

# Setapp agent lives outside /Applications/ — map its exe name to display name
SETAPP_AGENT_EXES: dict[str, str] = {
    'SetappAgent': 'Setapp',
    'SetappLauncher': 'Setapp',
}

for proc in processes:
    if not proc.strip():
        continue
    parts = proc.split()
    if len(parts) < 11:
        continue

    pid, cpu, mem = parts[1], parts[2], parts[3]
    cmd = ' '.join(parts[10:])

    is_system = '/System/Applications/' in cmd
    is_user   = re.search(r'(?<!/System)/Applications/', cmd) is not None
    is_setapp_agent = any(f'/{exe}' in cmd for exe in SETAPP_AGENT_EXES)

    if not is_system and not is_user and not is_setapp_agent:
        continue

    # Extract exe from the full command path (handles paths with spaces).
    # Take the last path component and strip any arguments (which start with " -").
    _raw_exe = cmd.rsplit('/', 1)[-1]
    exe = _raw_exe.split(' -')[0].strip()

    if is_setapp_agent and not is_user and not is_system:
        app_name = SETAPP_AGENT_EXES.get(exe, 'Setapp')
        user_apps[app_name].append({'pid': pid, 'cpu': cpu, 'mem': mem, 'exe': exe})
        continue

    # Capture the outermost .app bundle name.
    # Optional one-level subdirectory handles Setapp installs:
    #   /Applications/Cursor.app/...           → Cursor
    #   /Applications/Setapp/VoiceInk.app/...  → VoiceInk
    # All helper sub-bundles collapse to the parent app name.
    pattern = r'/(?:System/)?Applications/(?:[A-Z][^/]*/)?([^/]+?)\.app/'
    match = re.search(pattern, cmd)
    if not match:
        continue
    app_name = match.group(1)

    # Skip helpers / XPC / background sub-processes
    if any(skip in exe for skip in ['Helper', 'XPC', 'crashpad', 'BTTRelaunch']):
        continue
    if re.search(r'\s+(Helper|Extension|Renderer|GPU|Plugin|Updater|Agent)(\s*[\(\s]|$)', app_name):
        continue

    target = widget_apps if is_system else user_apps
    target[app_name].append({'pid': pid, 'cpu': cpu, 'mem': mem, 'exe': exe})

# ── Split user apps into GUI / menubar ────────────────────────────────────────
gui_apps: dict[str, list] = {}
menubar_apps: dict[str, list] = {}

def is_engine_only(app_name: str, procs: list[dict]) -> bool:
    """Return True if only the background engine is running (no GUI window process)."""
    engine_exes = ENGINE_ONLY_EXECUTABLES.get(app_name)
    if not engine_exes:
        return False
    return all(p.get('exe', '') in engine_exes for p in procs)

for app_name, procs in user_apps.items():
    if is_menubar_app(app_name) or is_engine_only(app_name, procs):
        menubar_apps[app_name] = procs
    else:
        gui_apps[app_name] = procs

# ── Render ────────────────────────────────────────────────────────────────────
console = Console()


def build_table(title: str, data: dict[str, list]) -> Table:
    table = Table(title=title)
    table.add_column("App", style="bold")
    table.add_column("PIDs", justify="right")
    table.add_column("CPU%", justify="right")
    table.add_column("MEM%", justify="right")
    for name, procs in sorted(data.items(), key=lambda x: x[0].lower()):
        cpu = sum(float(p['cpu']) for p in procs)
        mem = sum(float(p['mem']) for p in procs)
        table.add_row(f"{get_icon(name)} {name}", str(len(procs)), f"{cpu:.1f}%", f"{mem:.1f}%")
    return table


if not gui_apps and not menubar_apps and not widget_apps:
    console.print("No user applications found.")
else:
    tables = []
    if gui_apps:
        tables.append(build_table(f"🖥️  GUI Apps ({len(gui_apps)})", gui_apps))
    if menubar_apps:
        tables.append(build_table(f"⚡ Menubar Apps ({len(menubar_apps)})", menubar_apps))
    if widget_apps:
        tables.append(build_table(f"🪟 Widgets ({len(widget_apps)})", widget_apps))

    for i, table in enumerate(tables):
        if i:
            console.print()
        console.print(table)
