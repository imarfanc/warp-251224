#!/usr/bin/env python3
import os
import signal
import subprocess
import sys

from seminar_port_utils import parse_ports_list
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console(soft_wrap=False, color_system="standard", force_terminal=True)


def get_listeners_for_ports(ports):
    """Ask the kernel specifically who is listening on our target ports."""
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


def close_zone(zone_name, target_ports, border_style):
    """Announce closing time for a specific zone and gracefully shut down listeners."""
    console.rule(f"[bold]{zone_name}[/bold]", style=border_style)

    listeners = get_listeners_for_ports(target_ports)

    if not listeners:
        console.print(f"[dim]Zone is already clear. No active listeners on {target_ports}.[/dim]\n")
        return

    killed = []
    errors = []

    for pid, info in listeners.items():
        process_name = info.get("process", "Unknown")
        user = info.get("user", "Unknown")
        address = info.get("address", "Unknown")

        try:
            os.kill(int(pid), signal.SIGTERM)
            killed.append((process_name, pid, user, address))
        except ProcessLookupError:
            killed.append((process_name, pid, user, f"{address} (Already exited)"))
        except PermissionError:
            errors.append((process_name, pid, user, address, "Permission Denied (Not your process?)"))
        except Exception as e:
            errors.append((process_name, pid, user, address, str(e)))

    if killed:
        table = Table(title=f"🛑 Gracefully Stopped ({zone_name})", border_style=border_style, show_lines=False)
        table.add_column("Process", style="cyan", no_wrap=True)
        table.add_column("PID", style="magenta")
        table.add_column("User", style="green")
        table.add_column("Address", style="yellow")
        for row in killed:
            table.add_row(*row)
        console.print(table)

    if errors:
        err_table = Table(title=f"⚠️ Failed to Stop ({zone_name})", border_style="red")
        err_table.add_column("Process", style="cyan")
        err_table.add_column("PID", style="magenta")
        err_table.add_column("Address", style="yellow")
        err_table.add_column("Error", style="red")
        for row in errors:
            err_table.add_row(row[0], row[1], row[3], row[4])
        console.print(err_table)

    console.print()


if __name__ == "__main__":
    custom = parse_ports_list(sys.argv[1]) if len(sys.argv) > 1 else []

    console.print("[bold cyan]Initiating Graceful Shutdown Sequence...[/bold cyan]\n")

    if custom:
        close_zone("Custom ports", custom, "bright_cyan")
    else:
        close_zone("Zone 1: Primary Servers", [2000, 3000, 3001, 8000], "bright_green")
        close_zone("Zone 2: Secondary Servers", [4000, 4237, 4050], "yellow")
        close_zone("Zone 3: Tertiary Servers", [8002, 8011, 8087, 8978, 8999], "magenta")

    console.print(Panel("[bold green]Shutdown sequence complete.[/bold green]", border_style="green", expand=False))
