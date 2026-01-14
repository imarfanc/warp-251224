---
name: git-release
description: Generate release artifacts from git history. Creates changelog (Keep a Changelog format), pretty git history, and blog post. Use when running `/git-release` or when user wants to create release notes, changelogs, or summarize git commits for a release.
---

# Git Release

Generate 3 release artifacts from git history within a date range:
1. Pretty git history
2. Changelog (Keep a Changelog format)
3. Blog post (hybrid accessible/technical style)

## Workflow

### 1. Prompt for Date Range

Ask user for start and end dates using AskUserQuestion:

```
Question: "What date range should I use for this release?"
Options:
- "Last 7 days"
- "Last 30 days"
- "Since last release" (read from status file)
- Custom (user provides dates)
```

### 2. Check Status File

Read `_docs/_changes/release-status.json` if it exists:

```json
{
  "version": "v26110",
  "date": "2026-01-10",
  "lastCommit": "abc123def456..."
}
```

Use `lastCommit` to show user what was included in last release.

### 3. Fetch Git History

Run git log for the date range:

```bash
git log --since="YYYY-MM-DD" --until="YYYY-MM-DD" --pretty=format:"%H|%h|%an|%ae|%ad|%s" --date=iso --name-only
```

### 4. Generate Version String

Format: `vYMMDD` (e.g., `v26110` for 2026-01-10)

Check if version exists in `_docs/_changes/`. If so, append time: `vYMMDD_HHMM` (e.g., `v26110_1423`)

### 5. Create Output Files

Create `_docs/_changes/` directory if it doesn't exist.

Generate 3 files:

#### `v{version}_git-history.md`

```markdown
# Git History - v{version}

## Commits ({start_date} to {end_date})

### {short_hash} - {subject}
- **Author:** {author_name}
- **Date:** {date}
- **Files:** {file1}, {file2}...

[repeat for each commit]
```

#### `v{version}_changelog.md`

Follow Keep a Changelog format. See `references/changelog-format.md` for categorization rules.

```markdown
# Changelog

## [{version}] - {date}

### Added
- {feat commits, user-friendly descriptions}

### Changed
- {change/update/refactor commits}

### Fixed
- {fix/bugfix commits}

### Removed
- {remove/delete commits}
```

Omit empty sections. Transform commit messages to be user-focused (not developer-focused).

#### `v{version}_blog-post.md`

Hybrid style: accessible summary with technical details.

```markdown
# Release {version}: {catchy title based on main changes}

{1-2 paragraph summary of what's new and why it matters}

## Highlights

### {Feature 1 Name}
{User-friendly explanation of the feature and its benefits}

### {Feature 2 Name}
{...}

## Technical Details

{Bullet list of technical changes for developers}

## Bug Fixes

{Brief list of notable fixes}

## What's Next

{Optional: hint at upcoming features if known}
```

### 6. Update Status File

Write to `_docs/_changes/release-status.json`:

```json
{
  "version": "v{version}",
  "date": "{YYYY-MM-DD}",
  "lastCommit": "{latest_commit_hash}"
}
```

## Output Location

All files go to `_docs/_changes/`:
- `v{version}_git-history.md`
- `v{version}_changelog.md`
- `v{version}_blog-post.md`
- `release-status.json`

## Reference

- See `references/changelog-format.md` for Keep a Changelog formatting rules and commit categorization
