---
name: Frontmatter in md server
overview: Parse optional YAML frontmatter in `main.ts`, strip it before Markdown rendering, and extend the `/api/content` JSON plus the static client so a `title` (and other fields) in frontmatter are honored without breaking breadcrumbs or search.
todos:
  - id: server-split-parse
    content: Add frontmatter split + YAML parse in main.ts; strip before marked.parse; extend JSON with frontmatter
    status: completed
  - id: client-title
    content: Extend ContentResponse + document.title logic in document-loader.ts
    status: completed
  - id: bundle
    content: Run deno task bundle to refresh app.js
    status: completed
isProject: false
---

# Frontmatter support for deno-md-server

## Current behavior

- [`macOS-reset-26.4/deno-md-server/main.ts`](macOS-reset-26.4/deno-md-server/main.ts)
  reads the full file and runs `marked.parse(content)` on everything. Without
  stripping, YAML is passed through the Markdown pipeline and can produce odd
  output.
- The JSON field `title` is the **relative file path** (`fileName`), not a
  human-readable page title:

```93:93:macOS-reset-26.4/deno-md-server/main.ts
JSON.stringify({ html, title: fileName, absolutePath }),
```

- [`document-loader.ts`](macOS-reset-26.4/deno-md-server/static/document-loader.ts)
  sets `document.title` from the file path (`titleForFile(file)`), while
  `setDocPathDisplay` uses `data.title` (same path string). Frontmatter
  `title: "1"` should drive the **browser tab title** when present, while
  **breadcrumbs** should stay path-based (`1/1_one.md` style).

## Implementation

### 1. Server: split frontmatter + parse YAML

In [`main.ts`](macOS-reset-26.4/deno-md-server/main.ts):

- Add a small helper (same file is fine) that:
  - Detects a leading block matching the usual pattern: start of file, `---`,
    newline, body, newline, `---`, newline (GitHub-style / Jekyll-style).
  - If present, parse the middle with **`npm:yaml`** `parse` (or equivalent)
    into a plain object; on parse failure, fall back to **no strip** and empty
    meta so a malformed block does not blank the doc.
  - Return `{ body, frontmatter }` where `body` is the remainder after the
    closing `---` (what gets passed to `marked.parse`).
- If there is no opening frontmatter, `body ===` original content and
  `frontmatter` is omitted or `null`.

### 2. API response shape

Extend the successful `/api/content/...` payload with an optional serialized
object, e.g. `frontmatter: Record<string, unknown>` (or a typed subset). Keep
existing keys **`title`** (path), **`html`**, **`absolutePath`** unchanged so
the client keeps working.

- Rationale: avoids overloading `title` with two meanings; the client can read
  `frontmatter.title` for display tab title.

### 3. Client: use frontmatter for `document.title`

In
[`static/document-loader.ts`](macOS-reset-26.4/deno-md-server/static/document-loader.ts):

- Extend `ContentResponse` with optional `frontmatter?: Record<string, unknown>`
  (or a narrow type with optional `title?: string`).
- After a successful load, set:
  - **`document.title`**: if `frontmatter?.title` is a non-empty string, use
    something like `` `${frontmatter.title} · ${DEFAULT_TITLE}` ``; else keep
    existing `titleForFile(file)`.
- **`setDocPathDisplay`**: continue to use the **file path** (`file` or
  `data.title` as today—they match); do **not** replace the path bar with
  frontmatter title.

No changes required in [`app.ts`](macOS-reset-26.4/deno-md-server/static/app.ts)
unless you later surface `description` in the UI.

### 4. Search and file listing

- **`/api/search`**: No change required; searching the raw file still matches
  tags/title in frontmatter, which is reasonable.
- **`/api/files`**: Unchanged.

### 5. Rebuild bundled JS

[`deno.json`](macOS-reset-26.4/deno.json) defines `bundle`: after editing
TypeScript, run `deno task bundle` so
[`static/app.js`](macOS-reset-26.4/deno-md-server/static/app.js) stays in sync
(same as any prior client change).

## Optional (out of scope unless you want it)

- Use `description` for a `<meta name="description">` or a subtitle under the
  path bar.
- Sort file tree by `sort` from frontmatter (would require reading every file or
  caching metadata—larger change).
