# Git Pre-commit Hook: File Size Limit (500KB)

## Overview

This repository includes a pre-commit hook that prevents files larger than 500KB from being committed to git. This helps maintain repository performance and prevents accidentally committing large files that could bloat the repository.

## How It Works

### Hook Location

- **File:** `.git/hooks/pre-commit`
- **Language:** Bash script
- **Trigger:** Runs automatically before every commit

### What It Checks

- ✅ **New files** being added to the repository
- ✅ **Modified existing files** being committed
- ❌ **Already-tracked files** that haven't changed (normal git behavior)

### Size Limit

- **Current limit:** 500KB (configurable)
- **Variable:** `MAX_SIZE_KB=500` in the hook script
- **Calculation:** `MAX_SIZE_BYTES=$((MAX_SIZE_KB * 1024))`

## Behavior Examples

### ✅ Allowed (Under 500KB)

```bash
$ echo "small content" > small-file.txt
$ git add small-file.txt
$ git commit -m "add small file"
✅ All files are within size limits
[main abc123] add small file
```

### ❌ Blocked (Over 500KB)

```bash
$ dd if=/dev/zero of=large-file.bin bs=1024 count=600
$ git add large-file.bin
$ git commit -m "add large file"
❌ Commit rejected: The following files exceed 500KB limit:
large-file.bin (.58MB)

💡 Suggestions:
   - Use Git LFS for large binary files: git lfs track "large-file.bin"
   - Compress the file if possible
   - Remove the file from git tracking if not needed

To bypass this check, use: git commit --no-verify
```

## Why Existing Files Don't Trigger Warnings

### The Original Issue

If you have a PDF file (like `tmp/00000489-Scan Aug 18, 2025 at 4.42 PM.pdf`) that's already tracked in git and you don't modify it, the hook won't run because:

1. **Already committed:** The file was added before the hook was installed
2. **No changes:** Git only runs hooks on files being committed
3. **Normal behavior:** This is standard git pre-commit hook behavior

### Test Demonstration

When we tested with your 901KB PDF by copying it to a new file:

```bash
$ cp tmp/00000489-Scan* tmp/test-large-pdf.pdf
$ git add tmp/test-large-pdf.pdf
$ git commit -m "test large PDF"
❌ Commit rejected: The following files exceed 500KB limit:
tmp/test-large-pdf.pdf (.88MB)
```

## Configuration

### Changing the Size Limit

Edit `.git/hooks/pre-commit` and modify this line:

```bash
# Current setting (500KB)
MAX_SIZE_KB=500

# Examples:
# MAX_SIZE_KB=1000    # 1MB limit
# MAX_SIZE_KB=100     # 100KB limit
# MAX_SIZE_KB=10240   # 10MB limit
```

### Making the Hook More/Less Strict

```bash
# More strict (smaller limit)
MAX_SIZE_KB=100     # 100KB limit

# Less strict (larger limit)
MAX_SIZE_KB=2048    # 2MB limit
```

## Bypassing the Hook

### Emergency Bypass

If you absolutely need to commit a large file:

```bash
git commit --no-verify -m "emergency commit of large file"
```

### Disable Hook Temporarily

```bash
# Make non-executable (disable)
chmod -x .git/hooks/pre-commit

# Re-enable later
chmod +x .git/hooks/pre-commit
```

### Remove Hook Permanently

```bash
rm .git/hooks/pre-commit
```

## Best Practices for Large Files

### 1. Use Git LFS (Recommended)

For files you need to track in git:

```bash
# Track specific file types
git lfs track "*.zip"
git lfs track "*.pdf"
git lfs track "*.mp4"

# Track specific files
git lfs track "large-file.bin"
```

### 2. Compress Files

- Use compression tools to reduce file sizes
- Consider if you need the full resolution/quality

### 3. External Storage

- Store large files in cloud storage (Google Drive, Dropbox, etc.)
- Use `.gitignore` to exclude them:
  ```
  # In .gitignore
  large-files/
  *.zip
  *.rar
  ```

### 4. Documentation Only

- For reference materials, consider storing links or metadata instead of the files themselves

## Troubleshooting

### Hook Not Running

1. **Check permissions:** `ls -la .git/hooks/pre-commit`
2. **Should be executable:** `chmod +x .git/hooks/pre-commit`
3. **Test manually:** `bash .git/hooks/pre-commit`
4. **VS Code bypass:** If using VS Code, ensure `"git.enableSmartCommit": false` in settings

### False Positives

If the hook incorrectly blocks small files:

1. Check file size: `ls -lh filename`
2. Verify limit setting in hook script
3. Consider if you need to adjust `MAX_SIZE_KB`

### Performance Issues

The hook adds minimal overhead:

- Only runs during commits
- Uses efficient bash arithmetic
- Quick file size checks with `stat`

## Related Files

- **Hook script:** `.git/hooks/pre-commit`
- **Git ignore:** `.gitignore` (contains `.DS_Store` and other patterns)
- **Git LFS:** Install with `git lfs install` for large file support

## Support

- **Git hooks:** https://git-scm.com/docs/githooks
- **Git LFS:** https://git-lfs.github.com/
- **File size limits:** Consider repository requirements and team needs

---

_This hook helps maintain repository health by preventing accidental commits of large files while providing clear guidance on alternatives._
