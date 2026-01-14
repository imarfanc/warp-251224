# Keep a Changelog Format

Based on [keepachangelog.com](https://keepachangelog.com/en/1.1.0/).

## Structure

```markdown
# Changelog

## [version] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Features to be removed in future

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Vulnerability fixes
```

## Categorizing Commits

Map commit prefixes to changelog sections:

| Commit Prefix | Changelog Section |
|---------------|-------------------|
| `feat:` | Added |
| `add:` | Added |
| `change:` | Changed |
| `update:` | Changed |
| `refactor:` | Changed |
| `deprecate:` | Deprecated |
| `remove:` | Removed |
| `delete:` | Removed |
| `fix:` | Fixed |
| `bugfix:` | Fixed |
| `security:` | Security |
| `docs:` | (omit or include under Changed) |
| `style:` | (omit) |
| `test:` | (omit) |
| `chore:` | (omit) |

## Writing Guidelines

1. **User-focused** - Describe what changed for users, not implementation details
2. **Concise** - One line per change, use sub-bullets only if necessary
3. **Present tense** - "Add feature" not "Added feature"
4. **No periods** - Bullet points don't need ending punctuation

## Example

```markdown
# Changelog

## [v26110] - 2026-01-10

### Added
- User authentication with JWT tokens
- Dark mode toggle in settings
- Export data to CSV format

### Changed
- Dashboard now loads 50% faster
- Updated navigation menu layout

### Fixed
- Login button not responding on mobile
- Memory leak when processing large files

### Security
- Patch XSS vulnerability in comment field
```
