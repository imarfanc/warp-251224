# Local Mac-to-Mac folder sync guide

This reference covers keeping **/Users/arfan/Sync** and **/Volumes/arfan/Sync**
synchronized between two local Macs while preserving macOS metadata and avoiding
noisy Finder files.

---

## Paths and goal

- **Source:** /Users/arfan/Sync
- **Destination:** /Volumes/arfan/Sync
- **Goal:** Two-way sync with macOS extended attributes preserved; exclude
  cosmetic `.DS_Store` files.

---

## Quick commands

**Compare folders ignoring .DS_Store**

```bash
diff -rq -x .DS_Store /Users/arfan/Sync /Volumes/arfan/Sync
```

**Dry-run preview of a sync**

```bash
rsync -avn --delete --extended-attributes --exclude='.DS_Store'\
/Users/arfan/Sync/ /Volumes/arfan/Sync/
```

**Perform two-way sync**

```bash
rsync -av --delete --extended-attributes --exclude='.DS_Store'\
/Users/arfan/Sync/ /Volumes/arfan/Sync/ rsync -av --delete --extended-attributes
--exclude='.DS_Store'\
/Volumes/arfan/Sync/ /Users/arfan/Sync/
```

---

## Hidden files and folder customizations

- **Why Icon? and .DS_Store behave differently**\
  Finder stores custom icons and view settings in hidden metadata files. Use
  `--extended-attributes` to preserve flags and Finder metadata.

- **Re-hide a visible Icon? file**

```bash
chflags hidden "/Volumes/arfan/Sync/test-Sync-25129.library/Icon?"
```

- **Verify hidden flags**

```bash
ls -lO "/Volumes/arfan/Sync/test-Sync-25129.library/"
```

Look for `hidden` in the flags column.

---

## Automation with launchd

**Script file**

- Path: `/Users/arfan/sync-folders.sh`
- Content: same as the script above (with `--exclude='.DS_Store'`)

**Make executable**

```bash
chmod +x /Users/arfan/sync-folders.sh
```

**Launch agent plist**

- Path: `~/Library/LaunchAgents/com.arfan.sync.plist`
- Use `StartInterval` 3600 for hourly runs. Redirect stdout/stderr to
  `/tmp/sync.log` and `/tmp/sync-error.log`.

**Load and reload**

```bash
launchctl unload ~/Library/LaunchAgents/com.arfan.sync.plist launchctl load
~/Library/LaunchAgents/com.arfan.sync.plist
```

**Check status and logs**

```bash
launchctl list | grep com.arfan.sync tail -f /tmp/sync.log tail -f
/tmp/sync-error.log
```

---

## Best practices and troubleshooting

- **Exclude `.DS_Store`** to reduce cosmetic diffs and noise.
- **Run dry-runs** with `-n` before enabling `--delete`.
- **Two-way sync**: run rsync in both directions; consider conflict handling if
  both sides change the same file.
- **If Icon? appears visible**: re-hide with `chflags hidden`.
- **Permissions issues**: add `--chmod=ugo=rwX` if needed.
- **If you want identical Finder layouts**: do not exclude `.DS_Store`, but
  expect frequent differences.
