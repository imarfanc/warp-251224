# CLAUDE.md

This file provides guidance when working with code in this repository.

## Architecture

A Deno single-file server (`main.ts`) paired with a TypeScript frontend bundled
into `static/app.js`. The server exposes a small JSON API and serves the static
frontend; the frontend renders a sidebar file tree and a markdown pane.

### Server (`main.ts`)

- **Root selection is runtime state.** There is no configured content directory
  — the user picks a folder via the UI. The chosen absolute path is persisted to
  `.root-config.json` (gitignored) and restored on next start. All file APIs
  return HTTP 409 `{error: "No root selected"}` until a root is chosen; the
  frontend treats 409 as the "choose a folder" state.
- **Path safety.** Every file access goes through `resolvePathWithinRoot` +
  `isPathInside`, which `realPath`s the candidate and rejects anything that
  escapes the current root. `/api/open-in-cursor` applies the same check before
  shelling out.
- **Frontmatter.** `splitFrontmatter` parses a leading `---` YAML block. A
  numeric `sort` field is harvested for every `.md` under the root and returned
  in the files-list payload so the sidebar can order entries; a `title` field
  overrides the browser tab title.
- **Markdown rendering** uses `marked` server-side; HTML is returned to the
  client and enhanced in the browser.
- **Native integrations** (macOS-specific): `/api/pick-root` shells out to
  `osascript` for a native folder picker; `/api/open-in-cursor` shells out to
  the `cursor` CLI to open the current file in a Cursor window rooted at the
  workspace.

### API surface

- `GET /api/root` / `POST /api/root {path}` — get or set the current root.
- `POST /api/pick-root` — open the native folder picker (osascript).
- `GET /api/files` — list all `.md` paths (relative) + `sort` metadata map.
- `GET /api/search?q=...` — filename + full-text substring match,
  case-insensitive.
- `GET /api/content/:encodedRelPath` — returns
  `{html, title, absolutePath, frontmatter?}`.
- `POST /api/open-in-cursor {absolutePath}` — opens file in Cursor; path must be
  inside the root.

### Frontend (`static/`)

Entry point `static/app.ts` wires together a set of focused modules — each owns
one concern and they communicate through a shared
`ViewerDom = {tree, contentBody, docPathEl}` object rather than a global store.

- `file-tree.ts` — `FileTreeView` class; builds a nested tree from flat relative
  paths, handles selection, expand/collapse, pinning, and dimming (the two
  latter persist in localStorage via keys from `CONFIG.fileTree`).
- `document-loader.ts` — the main flow: fetch `/api/files`, fetch
  `/api/content/...`, render into `#content-body`, and apply post-processing
  (`enhanceProseCodeCopy`, `enhanceHeadingSections`, `applySyntaxHighlight`,
  `Iconify.scan`). Also owns the history/popstate integration via `file-url.ts`
  (`?file=...`).
- `heading-sections.ts` — per-`h2` collapse/blur, persisted per-file in
  localStorage under `md-viewer:sections:<slug>`.
- `root-picker.ts` — UI for the root selector (change/manual/native pick) and
  emits a `handleRootChanged` callback that clears state and reloads the file
  list.
- `file-search.ts`, `sidebar-fab.ts`, `next-h2-fab.ts`, `frontmatter-meta.ts`,
  `code-copy.ts`, `content-fragments.ts`, `doc-path.ts` — self-describing
  single-purpose helpers.
- `config.ts` — all tunables (favicon, sidebar widths/storage keys, code-block
  max height, Marked 2 URL handler base). Prefer adding knobs here over
  hardcoding.

External runtime deps are loaded from CDNs in `index.html`: Tailwind (CDN
script), Prism.js, and Iconify. TypeScript globals for Iconify and Prism live
in `*-global.d.ts` files.

### Conventions worth knowing

- Paths passed between server and frontend are **root-relative POSIX strings**
  (e.g. `sub/dir/file.md`). The server strips `${root}/` before returning; the
  client URL-encodes them for `/api/content/`.
- State lives in the browser (localStorage) for pins/dims/collapsed
  sections/sidebar width, and in `.root-config.json` for the root. There is no
  database.
- Remember to re-run `deno task bundle` after editing any `.ts` under `static/`
  — otherwise the running server will keep serving the old `app.js`.
