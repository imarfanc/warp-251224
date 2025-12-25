# VS Code: List, Export, and Restore Extensions

This guide shows how to list and save the extensions installed in VS Code
Stable, and how to restore them later.

Prerequisites

- Ensure the `code` CLI is available. In VS Code: Command Palette → Shell
  Command: Install `code` command in PATH.

Export installed extensions (Stable)

- Save a list with versions to your Desktop:
  `code --list-extensions --show-versions | tee ~/Desktop/vscode-extensions-stable.txt`

- Also save into this repo (optional):
  `mkdir -p docs && code --list-extensions --show-versions > docs/vscode-extensions-stable.txt`

Optional: VS Code Insiders

- Save a list with versions to your Desktop:
  `code-insiders --list-extensions --show-versions | tee ~/Desktop/vscode-extensions-insiders.txt`

Restore from a list

- Install each extension from a list file (Stable):
  `xargs -n1 code --install-extension < path/to/list.txt`

- Force reinstall/update (Stable):
  `xargs -n1 code --install-extension --force < path/to/list.txt`

Tips

- Workspace recommendations live in `.vscode/extensions.json`
- To diff current set vs saved list:
  `comm -3 <(code --list-extensions | sort) <(cut -d@ -f1 docs/vscode-extensions-stable.txt | sort)`

Example outputs are plain-text lists in the format publisher.extension@version.
