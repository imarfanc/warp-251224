#!/usr/bin/env python3
import sys
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()

target_path = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()

if not target_path.exists():
    console.print(Panel(f"[red]Error:[/red] The path '{target_path}' does not exist.", border_style="red"))
    sys.exit(1)

removed, errors = [], []
total_size = 0

ds_files = [f for f in target_path.rglob(".DS_Store") if f.is_file()]

if not ds_files:
    console.print(Panel(
        f"[bold green]Pristine![/bold green]\nNo .DS_Store files found in [cyan]{target_path}[/cyan].",
        border_style="green",
        expand=False,
    ))
    sys.exit(0)

for f in ds_files:
    try:
        size = f.stat().st_size
        f.unlink(missing_ok=True)
        removed.append((f, size))
        total_size += size
    except OSError as e:
        errors.append((f, str(e)))


def human_size(nbytes):
    for unit in ["B", "KB", "MB", "GB"]:
        if nbytes < 1024.0:
            return f"{nbytes:3.1f} {unit}"
        nbytes /= 1024.0
    return f"{nbytes:.1f} TB"


if removed:
    table = Table(title="🗑️  .DS_Store Files Removed", show_lines=False, border_style="dim")
    table.add_column("Relative Path", style="cyan", no_wrap=False)
    table.add_column("Size", style="green", justify="right")

    for path, size in removed:
        try:
            display_path = path.relative_to(target_path)
        except ValueError:
            display_path = path.name
        table.add_row(str(display_path), human_size(size))

    console.print(table)

if errors:
    err_table = Table(title="⚠️  Permission Errors", border_style="red")
    err_table.add_column("File", style="red")
    err_table.add_column("Reason", style="yellow")
    for path, err in errors:
        err_table.add_row(str(path.name), err)
    console.print(err_table)

summary = (
    f"[bold green]{len(removed)}[/] file{'s' if len(removed) != 1 else ''} removed\n"
    f"[bold yellow]{human_size(total_size)}[/] freed\n"
    f"[bold red]{len(errors)}[/] error{'s' if len(errors) != 1 else ''} encountered"
)
console.print(Panel(summary, title="🧹 Cleanup Summary", border_style="green", expand=False))
