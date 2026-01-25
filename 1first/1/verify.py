import shutil
import subprocess
import sys

try:
    from rich.console import Console
    from rich.table import Table
except ImportError:
    print("Rich library not installed. Run: pip install rich")
    sys.exit(1)

console = Console()

def get_version(cmd, args, parser=None):
    if not shutil.which(cmd):
        return "[red]Not installed[/red]"
    try:
        res = subprocess.run([cmd] + args, capture_output=True, text=True)
        output = res.stdout.strip()
        if parser:
            return parser(output)
        return output.split('\n')[0]
    except Exception as e:
        return f"[red]Error: {e}[/red]"

table = Table(title="Shell Environment Versions")
table.add_column("Tool", style="cyan", no_wrap=True)
table.add_column("Version", style="green")

# Parsers
parse_curl = lambda x: x.split()[1]
parse_go = lambda x: x.split()[2] if len(x.split()) > 2 else x
parse_python = lambda x: x.split()[1] if len(x.split()) > 1 else x
parse_uv = lambda x: x.split()[1] if len(x.split()) > 1 else x
parse_deno = lambda x: x.split()[1] if len(x.split()) > 1 else x
parse_vt = lambda x: x.split()[0] if len(x.split()) > 0 else x


table.add_row("curl", get_version("curl", ["-V"], parse_curl))
table.add_row("git", get_version("git", ["--version"], lambda x: x.split()[2]))
table.add_row("gh", get_version("gh", ["--version"], lambda x: x.split()[2]))
table.add_row("Go", get_version("go", ["version"], parse_go))
table.add_row("Python", get_version("python3", ["--version"], parse_python))
table.add_row("uv", get_version("uv", ["--version"], parse_uv))
table.add_row("Node.js", get_version("node", ["-v"]))
table.add_row("npm", get_version("npm", ["-v"]))
table.add_row("Deno", get_version("deno", ["--version"], parse_deno))
table.add_row("vt", get_version("vt", ["--version"], parse_vt))
table.add_row("Bun", get_version("bun", ["--version"]))

console.print(table)