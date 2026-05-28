set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
    @just --list

# Launch the web-apps just-runner UI
just-runner:
    cd just-runner && ([ -d node_modules ] || npm install) && npm start
