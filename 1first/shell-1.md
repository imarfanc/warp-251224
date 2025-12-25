# Shell Environment Setup

## Prerequisites

### Homebrew

https://brew.sh/

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Github Desktop

https://github.com/apps/desktop

### Git

https://git-scm.com/

```bash
brew install git
```

### GitHub CLI

https://cli.github.com/

```bash
brew install gh
```

## Check Current Versions

```bash
printf "%-10s | %-15s\n" "Tool" "Version"
printf "%-10s | %-15s\n" "----------" "---------------"
printf "%-10s | %-15s\n" "curl" "$(curl -V | head -n 1 | awk '{print $2}')"
printf "%-10s | %-15s\n" "git" "$(git --version | awk '{print $3}')"
printf "%-10s | %-15s\n" "gh" "$(gh --version | head -n 1 | awk '{print $3}')"
printf "%-10s | %-15s\n" "Go" "$(go version 2>/dev/null | awk '{print $3}' || echo 'Not installed')"
printf "%-10s | %-15s\n" "Python" "$(python3 --version 2>/dev/null | awk '{print $2}' || echo 'Not installed')"
printf "%-10s | %-15s\n" "uv" "$(uv --version 2>/dev/null || echo 'Not installed')"
printf "%-10s | %-15s\n" "Node.js" "$(node -v 2>/dev/null || echo 'Not installed')"
printf "%-10s | %-15s\n" "npm" "$(npm -v 2>/dev/null || echo 'Not installed')"
printf "%-10s | %-15s\n" "Deno" "$(deno --version 2>/dev/null | head -n 1 | awk '{print $2}' || echo 'Not installed')"
printf "%-10s | %-15s\n" "vt" "$(vt --version 2>/dev/null | head -n 1 | awk '{print $2}' || echo 'Not installed')"
printf "%-10s | %-15s\n" "Bun" "$(bun --version 2>/dev/null || echo 'Not installed')"
```

## Install Tools

### Go

https://go.dev/dl/

### Python

https://www.python.org/downloads/

### uv

https://docs.astral.sh/uv/getting-started/installation/

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh

# in lieu of restarting the shell
source $HOME/.local/bin/env
```

### node.js

https://nodejs.org/en/download/current

```bash
# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"

# Download and install Node.js:
nvm install 25

# Verify the Node.js version:
node -v # Should print "v25.2.1".

# Verify npm version:
npm -v # Should print "11.6.2".
```

### Deno

https://docs.deno.com/runtime/

```bash
curl -fsSL https://deno.land/install.sh | sh
```

### Val Town CLI

https://github.com/val-town/vt

```bash
deno install -grAf jsr:@valtown/vt
```

After installing, clone the project:

```bash
vt clone https://www.val.town/x/arfan/neoApps-2511
```

### Bun

https://bun.sh/

```bash
curl -fsSL https://bun.sh/install | bash
```

## Verify Installations

### Verify using bash

```bash
git --version
gh --version
go version
python3 --version
uv --version
node -v
npm -v

deno --version
vt --version
bun --version
```

### Verify with Python Rich

First, install the `rich` library:

```bash
pip3 install rich
```

Then create a file named `verify_env.py` with the following content:

```python
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
```

Run the script:

```bash
python3 verify_env.py
```
