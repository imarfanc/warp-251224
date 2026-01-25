# Shell Environment Setup

## Prerequisites

### xcode command line tools

<https://developer.apple.com/xcode/>

```bash
xcode-select --install
```

### homebrew

<https://brew.sh/>

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Github Desktop

<https://github.com/apps/desktop>

### Git

<https://git-scm.com/>

```bash
brew install git
```

### GitHub CLI

<https://cli.github.com/>

```bash
brew install gh
```

## Install Tools

### Go

<https://go.dev/dl/>

install using [this guide](../install-go.md)

### Python

<https://www.python.org/downloads/>

install using [this guide](../install-python.md)

### uv

<https://docs.astral.sh/uv/getting-started/installation/>

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh

# in lieu of restarting the shell
source $HOME/.local/bin/env
```

### node.js

<https://nodejs.org/en/download/current>

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

<https://docs.deno.com/runtime/>

```bash
curl -fsSL https://deno.land/install.sh | sh
```

### Val Town CLI

<https://github.com/val-town/vt>

```bash
deno install -grAf jsr:@valtown/vt
```

After installing, clone the project:

```bash
mkdir ~/Developer/vt
cd ~/Developer/vt
# vt clone arfan/TEMPLATE  --no-editor-files
vt clone https://www.val.town/x/arfan/TEMPLATE  --no-editor-files
```

### Bun

<https://bun.sh/>

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

Find a file named `verify_env.py` in the same directory as this markdown file.

Run the script:

```bash
python3 verify_env.py
```
