# Repository Cleanup: Remove “folderview” and “charm-sampler” with git-filter-repo

This guide rewrites Git history to remove all occurrences of the two large binary files named “folderview” and “charm-sampler”, shrinks the `.git` directory, and force-pushes the cleaned history.

Important: History rewrites are disruptive. All collaborators must rebase/hard-reset or reclone after you force-push the new history.


## Prerequisites

- macOS with Homebrew, or Python/pip alternative.
- A clean working tree (no staged or unstaged changes).
- Optional but recommended: operate in a fresh clone.

Install git-filter-repo (choose one):

```bash
# Homebrew (recommended on macOS)
brew install git-filter-repo

# OR: pip/pipx
pipx install git-filter-repo
# or
pip install --user git-filter-repo
```


## Targeting options

Choose ONE option depending on where those binaries lived:

- Option A: files existed only at repo root as [folderview](folderview) and [charm-sampler](charm-sampler).
- Option B: files may appear anywhere in the tree; match by filename regardless of folder.

Note: This does NOT touch the Go source directory [go-scripts/folderview](go-scripts/folderview).


## Option A — remove root-level files only

```bash
git fetch --all --prune
git filter-repo --path 'folderview' --path 'charm-sampler' --invert-paths --force

# Expire reflogs and aggressively GC unreachable blobs
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Verify no remaining blobs at root-only file paths (blobs only)
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(rest)' | awk '$1=="blob"{print $3}' | grep -E '^(folderview|charm-sampler)$' || echo "OK: not found"

# Force-push rewritten history (branches + tags)
git push origin --force --all
git push origin --force --tags
```


## Option B — remove files by name anywhere in the tree

```bash
git fetch --all --prune
git filter-repo --path-regex '(^|.*/)folderview$' --path-regex '(^|.*/)charm-sampler$' --invert-paths --force

# Expire reflogs and aggressively GC unreachable blobs
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Verify no remaining blobs by those filenames anywhere (blobs only)
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(rest)' | awk '$1=="blob"{print $3}' | grep -E '(^|.*/)?(folderview|charm-sampler)$' || echo "OK: not found"

# Force-push rewritten history (branches + tags)
git push origin --force --all
git push origin --force --tags
```


## Pushing to a remote (if origin is unset)

If you see:

```
fatal: 'origin' does not appear to be a git repository
```

Set your remote and push:

```bash
git remote add origin YOUR_REPO_URL
git push origin --force --all
git push origin --force --tags
```

## Mirror-clone (safer) workflow

This avoids touching your working copy and ensures every ref is updated.

```bash
# in a separate directory from your working copy
git clone --mirror YOUR_REPO_URL repo.git
cd repo.git

# Choose A (paths) or B (path-regex):
# A:
git filter-repo --path 'folderview' --path 'charm-sampler' --invert-paths --force
# B:
git filter-repo --path-regex '(^|.*/)folderview$' --path-regex '(^|.*/)charm-sampler$' --invert-paths --force

git reflog expire --expire=now --all
git gc --prune=now --aggressive

git push --force --mirror
```


## Prevent future commits of these binaries

Add these lines to your root [.gitignore](.gitignore):

```gitignore
/folderview
/charm-sampler
```

Commit the change:

```bash
git add .gitignore
git commit -m "chore(git): ignore large binaries folderview and charm-sampler"
git push
```


## Post-rewrite instructions for collaborators

All clones must realign to the new history to avoid resurrecting deleted blobs:

Option 1 — reclone (simplest):

```bash
rm -rf your-repo
git clone YOUR_REPO_URL
```

Option 2 — hard reset existing clone (advanced users):

```bash
git fetch --all --prune
# replace main with your default branch if different
git checkout main
git reset --hard origin/main

# Clean up any stale or local-only branches that track old commits
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/original/ | xargs -n 1 echo "Stale ref:" || true
git update-ref -d refs/original/refs/heads/main || true
git gc --prune=now
```


## Verifying size reduction

Current repository object stats:

```bash
git count-objects -vH
```

Find any large remaining objects (should be none for the targeted names):

```bash
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '$1=="blob"{print $3, $2, $4}' | sort -nr | head -n 20
```


## Notes

- The path-regex form matches files whose final path component is exactly “folderview” or “charm-sampler”.
- The Go code directory [go-scripts/folderview](go-scripts/folderview) remains intact.
- If your default branch isn’t main, replace it accordingly in commands above.
- Ensure CI caches don’t restore old history; refresh caches if necessary.


## Quick reference (copy/paste)

Root-only:

```bash
git fetch --all --prune
git filter-repo --path 'folderview' --path 'charm-sampler' --invert-paths --force
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(rest)' | awk '$1=="blob"{print $3}' | grep -E '^(folderview|charm-sampler)$' || echo "OK: not found"
git push origin --force --all
git push origin --force --tags
```

Anywhere-in-tree:

```bash
git fetch --all --prune
git filter-repo --path-regex '(^|.*/)folderview$' --path-regex '(^|.*/)charm-sampler$' --invert-paths --force
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(rest)' | awk '$1=="blob"{print $3}' | grep -E '(^|.*/)?(folderview|charm-sampler)$' || echo "OK: not found"
git push origin --force --all
git push origin --force --tags
```


--- 

Document: [git-filter-repo-cleanup.md](git-filter-repo-cleanup.md)