#!/usr/bin/env python3
import os
import subprocess
from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

def log_width() -> int:
    raw = os.environ.get("JUST_RUNNER_LOG_WIDTH", "52")
    try:
        return max(40, min(int(raw), 80))
    except ValueError:
        return 52


WIDTH = log_width()  # zone headers / empty panels only
console = Console(soft_wrap=False, color_system="standard", force_terminal=True)


def get_listeners_for_ports(ports):
    if not ports:
        return {}

    port_list = ",".join(str(p) for p in ports)
    cmd = ["lsof", "-F", "pcLn", "-P", "-n", "-sTCP:LISTEN", f"-iTCP:{port_list}"]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError:
        return {}

    listeners = {}
    current_pid = None

    for line in result.stdout.split("\n"):
        if not line:
            continue
        identifier = line[0]
        value = line[1:]

        if identifier == "p":
            current_pid = value
            listeners[current_pid] = {"pid": value}
        elif identifier == "c" and current_pid:
            listeners[current_pid]["process"] = value
        elif identifier == "L" and current_pid:
            listeners[current_pid]["user"] = value
        elif identifier == "n" and current_pid:
            listeners[current_pid]["address"] = value

    return listeners


def get_deep_details(pid):
    details = {}

    path_cmd = ["lsof", "-a", "-p", pid, "-Fn", "-d", "txt"]
    try:
        res = subprocess.run(path_cmd, capture_output=True, text=True)
        for line in res.stdout.split("\n"):
            if line.startswith("n/"):
                details["path"] = line[1:]
                break
        else:
            details["path"] = "?"
    except Exception:
        details["path"] = "?"

    ps_cmd = ["ps", "-p", pid, "-o", "ppid=,pcpu=,pmem=,rss="]
    try:
        res = subprocess.run(ps_cmd, capture_output=True, text=True, check=True)
        parts = res.stdout.strip().split()
        if len(parts) >= 4:
            details["ppid"] = parts[0]
            details["cpu"] = parts[1]
            details["mem"] = parts[2]
            details["rss_kb"] = parts[3]
    except Exception:
        details["ppid"] = details["cpu"] = details["mem"] = "?"

    ppid = details.get("ppid")
    if ppid and ppid not in ("?", "1", "0"):
        try:
            res = subprocess.run(["ps", "-p", ppid, "-o", "comm="], capture_output=True, text=True)
            details["parent_name"] = res.stdout.strip() or "init"
        except Exception:
            details["parent_name"] = "?"
    else:
        details["parent_name"] = "init"

    return details


def listener_table(info, deep, port_str: str) -> Table:
    proc = info.get("process", "?")
    pid = info.get("pid", "?")
    user = info.get("user", "?")
    address = info.get("address", "?")

    rss = deep.get("rss_kb", "0")
    mem = f"{int(rss) / 1024:.1f} MB" if str(rss).isdigit() else "?"
    cpu = deep.get("cpu", "?")
    parent = deep.get("parent_name", "?")
    ppid = deep.get("ppid", "?")
    exe = deep.get("path", "?")
    url = f"http://localhost:{port_str}/" if port_str.isdigit() else "—"

    table = Table(show_header=False, box=box.SIMPLE, pad_edge=False, expand=False)
    table.add_column("key", style="dim", width=8, no_wrap=True)
    table.add_column("val", no_wrap=True, overflow="ignore")

    table.add_row("addr", address)
    table.add_row("url", f"[cyan]{url}[/]")
    table.add_row("proc", f"[bold]{proc}[/]  pid {pid}")
    table.add_row("user", user)
    table.add_row("exe", exe)
    table.add_row("cpu/mem", f"{cpu}%  {mem}")
    table.add_row("parent", f"{parent}  (ppid {ppid})")
    return table


def run_investigation(zone_label: str, target_ports, style: str = "green"):
    ports_s = ", ".join(str(p) for p in target_ports)
    header = Text()
    header.append(zone_label, style=f"bold {style}")
    header.append(f"  {ports_s}", style="dim")
    console.print(header)

    listeners = get_listeners_for_ports(target_ports)

    if not listeners:
        console.print(Panel("[dim]no listeners[/]", border_style=style, width=WIDTH, expand=False))
        return

    for pid, info in listeners.items():
        address = info.get("address", "?")
        port_str = address.split(":")[-1]
        proc = info.get("process", "?")
        deep = get_deep_details(pid)
        title = f":{port_str}  {proc}  pid {pid}"

        console.print(
            Panel(
                listener_table(info, deep, port_str),
                title=title,
                border_style=style,
                expand=False,
                padding=(0, 1),
            )
        )


if __name__ == "__main__":
    run_investigation("Zone 1 · primary", [3000, 3001, 8000], "bright_green")
    console.print()
    run_investigation("Zone 2 · secondary", [4000, 4237, 4050, 4500], "yellow")
    console.print()
    run_investigation("Zone 3 · tertiary", [8002, 8011, 8087, 8978, 8999], "magenta")
