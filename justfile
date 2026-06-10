set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
    @just --list

# Serve static files at http://localhost:8080/
serve:
    go build -o .warp-go-server . && exec ./.warp-go-server

# Launch the web-apps just-runner UI
just-runner:
    cd APPS/just-runner && ([ -d node_modules ] || npm install) && npm start
