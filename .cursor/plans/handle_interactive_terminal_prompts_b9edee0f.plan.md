---
name: Handle Interactive Terminal Prompts
overview: Modify the backend to support piping user input to running processes and update the frontend to remain interactive during command execution.
todos:
  - id: server-stdin-support
    content: Refactor server.js to track and write to activeProcess.stdin
    status: completed
  - id: client-stdin-support
    content: Update script.js to send stdin messages when a process is running
    status: completed
  - id: test-interactive-prompts
    content: Test interactive prompts in the web terminal
    status: completed
isProject: false
---

# Plan: Handle Interactive Terminal Prompts

This plan enables the web terminal to respond to interactive prompts (like `y/N`
confirmations) by maintaining a reference to the active process on the server
and forwarding user input to its standard input.

## Backend Changes

### [Apps/web-terminal-v2/server.js](Apps/web-terminal-v2/server.js)

- Maintain an `activeProcess` variable within the WebSocket connection scope.
- Update the message handler to distinguish between "starting a new command" and
  "sending input to a running process".
- When a new process is spawned, store it in `activeProcess`.
- Implement a `stdin` message type that writes directly to
  `activeProcess.stdin`.
- Ensure `activeProcess` is cleared when the process closes.

## Frontend Changes

### [Apps/web-terminal-v2/public/script.js](Apps/web-terminal-v2/public/script.js)

- Remove `term.pause()` and `term.resume()` calls to keep the terminal
  interactive during command execution.
- Introduce a `isProcessRunning` state variable.
- Modify the terminal's interpreter function to check `isProcessRunning`:
- If `true`, send the user's input as a `stdin` message via WebSocket.
- If `false`, proceed with the current behavior of sending a new command.
- Update the WebSocket message handler to toggle `isProcessRunning` based on the
  process status.

## Verification

- Test with an interactive command like `vt pull` or a simple script that asks
  for input.
- Verify that typing `y` and pressing Enter successfully reaches the underlying
  process.
