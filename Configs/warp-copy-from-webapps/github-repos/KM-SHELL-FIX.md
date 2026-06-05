# KM "Execute Shell Script" — `fg: no job control` Fix

## Running a KM Variable as a Shell Command

Your KM action already has `$myVar_webCMD264` as the script text — KM substitutes the variable first, then runs the result. But if you want to do this explicitly inside a shell script:

```bash
#!/bin/bash

# Execute the command stored in the variable
eval "$KMVAR_myVar_webCMD264"
```

Or if it's a simple single command with no pipes/redirects:

```bash
#!/bin/bash

$KMVAR_myVar_webCMD264
```

`eval` is the safer choice when the command contains pipes, flags, or chained operators — it handles the full shell parsing. Without `eval`, complex commands stored as strings won't expand correctly.

---

## Error

```text
Execute a Shell Script failed with script error: text-script: line 1: fg: no job control
```

## Cause

KM's Execute Shell Script action runs in a **non-interactive shell** (no job control). If the command internally forks a process and tries to call `fg` (foreground it), it fails. The `cursor` CLI does this.

## Fix

### Option A — use `open` instead of `cursor` CLI (recommended)

In the KM Execute Shell Script action, change the script from:

```bash
cursor --new-window $HOME/Developer/gh/vt2
```

to:

```bash
open -na "Cursor" --args --new-window "$HOME/Developer/gh/vt2"
```

`open -na` always launches a new instance (`-n`) of the named app (`-a`).

**If the value comes from a URL trigger via `$KMVAR_value`**, replace the script body with:

```bash
#!/bin/bash
APP_PATH=$(echo "$KMVAR_value" | sed 's|cursor |/Applications/Cursor.app/Contents/MacOS/Cursor |')
nohup $APP_PATH > /dev/null 2>&1 &
```

Or simpler — update the URL's `value` parameter to send an `open` command instead of `cursor`:

```bash
open -na "Cursor" --args --new-window $HOME/Developer/gh/<repo>
```

Then the KM script just runs `$KMVAR_value` in bash and `open` doesn't need job control.

### Option B — wrap in `nohup ... &`

In KM script:

```bash
#!/bin/bash
nohup $KMVAR_value > /dev/null 2>&1 &
```

This detaches the process so job control is never needed.

### Option C — set KM shell to `/bin/bash` with interactive flag

In the Execute Shell Script action settings, set the shell to:

```bash
/bin/bash -i
```

The `-i` flag enables job control in bash. Less clean but works.

## Recommended: Update the link URL

Change `github-repos.js` to pass an `open` command instead of `cursor`:

```js
const cmd = `open -na "Cursor" --args --new-window ${repo.repo_local_path}`;
```

This way KM's shell script can just be `eval "$KMVAR_value"` or `$KMVAR_value` with no special handling.
