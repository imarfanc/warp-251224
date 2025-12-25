# My Custom Commands

## open .zshrc

```bash
open ~/.zshrc
```

```bash
source ~/.zshrc
```

## custom commands

```zsh
# MY CUSTOM COMMANDS

## warp
warp() {
  open -a Warp .
}

### custom commands in md
ccm() {
  ls "$HOME/Developer/gh/macOS-25.10.15/data/zsh-custom-commands.md"
}

## custom commands command
cc() {
  local cmd
  cmd=$(
    cat <<'EOF' | fzf \
      --prompt='⚡ Common commands > ' \
      --height=18 \
      --layout=reverse \
      --border=rounded \
      --no-multi \
      --cycle \
      --info=inline \
      --header=$'↑↓ select • Enter run • Esc cancel\n'
📄 Docs
  Open AGENTS.md (preview)
  Open commands.md (preview)

📁 Warp / Finder
  Open repo in Warp
  Open repo in Finder

🌿 Git
  Git status
  Git diff
  Git log (20)

🟢 Node
  Node: install deps (npm i)
  Node: dev (npm run dev)
  Node: test (npm test)
  Node: build (npm run build)

🦕 Deno
  Deno: task dev
  Deno: task test

🏘️ Val Town
  Val Town: open current dir in browser (if val)
  Val Town: status (vt)
  Val Town: push (vt)
EOF
  ) || return 0

  # Esc / no selection
  [[ -z "$cmd" ]] && return 0

  # Trim leading spaces + optional section indentation
  cmd="${cmd#"  "}"

  case "$cmd" in
    "Open AGENTS.md (preview)") less AGENTS.md ;;
    "Open commands.md (preview)") less ~/.warp/commands.md ;;

    "Open repo in Warp") open -a Warp . ;;
    "Open repo in Finder") open . ;;

    "Git status") command -v git >/dev/null && git status || echo "git not found" ;;
    "Git diff") command -v git >/dev/null && git diff || echo "git not found" ;;
    "Git log (20)") command -v git >/dev/null && git log --oneline --decorate -n 20 || echo "git not found" ;;

    "Node: install deps (npm i)") command -v npm >/dev/null && npm i || echo "npm not found" ;;
    "Node: dev (npm run dev)")
      [[ -f package.json ]] && npm run dev || echo "No package.json here"
      ;;
    "Node: test (npm test)")
      [[ -f package.json ]] && npm test || echo "No package.json here"
      ;;
    "Node: build (npm run build)")
      [[ -f package.json ]] && npm run build || echo "No package.json here"
      ;;

    "Deno: task dev")
      [[ -f deno.json || -f deno.jsonc ]] && deno task dev || echo "No deno.json/deno.jsonc here"
      ;;
    "Deno: task test")
      [[ -f deno.json || -f deno.jsonc ]] && deno task test || echo "No deno.json/deno.jsonc here"
      ;;

    "Val Town: status (vt)") command -v vt >/dev/null && vt status || echo "vt not found (install Val Town CLI)" ;;
    "Val Town: push (vt)") command -v vt >/dev/null && vt push && sleep 1 && vt push || echo "vt not found (install Val Town CLI)" ;;
    "Val Town: open current dir in browser (if val)")
      # If you're in a Val Town project with a known URL, open it.
      # (Keeps this harmless if not in a vt repo)
      if [[ -n "$VALTOWN_URL" ]]; then
        open "$VALTOWN_URL"
      else
        echo "Set VALTOWN_URL in your env to use this, e.g. export VALTOWN_URL='https://www.val.town/v/<you>/<val>'"
      fi
      ;;
  esac
}
```
