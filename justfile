set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
    @just --list

# Serve static files at http://localhost:8080/
serve:
    @bash -c '\
      if command -v gum >/dev/null; then \
        gum style --border rounded --padding "1 2" --border-foreground 39 --bold "warp-251224"; \
        gum style --foreground 78 "http://localhost:8080/"; \
        gum style --foreground 240 "  index → HTML/repo-overview.html"; \
        gum style --margin "1 0 0 0" --faint "Ctrl+C or Ctrl+D to stop"; \
        echo; \
      else \
        printf "warp-251224\nhttp://localhost:8080/\n  index → HTML/repo-overview.html\nCtrl+C or Ctrl+D to stop\n\n"; \
      fi; \
      go build -o .warp-go-server . && exec ./.warp-go-server'

# Launch the web-apps just-runner UI
just-runner:
    cd APPS/just-runner && ([ -d node_modules ] || npm install) && npm start
