feat(macos-reset): 📚 Deno markdown server, viewer UI, and bundled notes

    ╔═══════════════════════════════════════════════════════════╗
    ║   __  __          ____    _____                           ║
    ║  |  \/  |   /\   |  _ \  |  __ \      .md  →  HTML        ║
    ║  | \  / |  /  \  | | | | | |__) |     Deno  →  serve      ║
    ║  | |\/| | / /\ \ | | | | |  _  /      tree →  browse      ║
    ║  | |  | |/ ____ \| |_| | | | \ \      API  →  search      ║
    ║  |_|  |_/_/    \_\____/  |_|  \_\                         ║
    ║                                                           ║
    ║         macOS-reset-26.4 · local markdown workspace       ║
    ╚═══════════════════════════════════════════════════════════╝

## 🎯 Why this commit exists

This adds a small, self-contained **Deno HTTP server** that serves a static **Markdown
viewer** plus a tree of `.md` notes under `macOS-reset-26.4/mds/`. The goal is a
pleasant local reading experience: sidebar navigation, URL-deep links, search, fenced
code tooling, syntax highlighting, and prose styling—without a heavyweight frontend
build (only `deno bundle` for the client TS).

## 📦 What landed (high level)

| Area | ✨ What you get |
|------|-----------------|
| 🖥️ **Server** | `Deno.serve`, `serveDir` for static assets, `import.meta.url`-based paths so `deno task serve` works from `macOS-reset-26.4/` |
| 📂 **API** | `GET /api/files` — list all `.md` paths · `GET /api/content/…` — rendered HTML + title · `GET /api/search?q=` — filter by **path or file body** |
| 🌳 **Sidebar** | Expand/collapse folders, active file highlight, debounced search (`file-search.ts`) |
| 🔗 **Routing** | `?file=relative/path.md` synced with history (`pushState` / `replaceState` / `popstate`) |
| 📋 **Code blocks** | Toolbar: language (lowercase id), optional fence filename, line count, **Copy** + placeholder **Run**, Iconify icons (`code-copy.ts` + `code-copy.css`) |
| 🎨 **Highlighting** | highlight.js (cdnjs) + `applySyntaxHighlight` after inject; normalizes `language-bash:foo.sh` for the highlighter (`highlight-code.ts`) |
| 🧭 **Layout** | FAB bottom-left toggles sidebar; preference in `localStorage` (`layout.css`) |
| 📝 **Prose** | Tables, headings, task lists (checkbox rows styled as a card list; bullets hidden when checkboxes present) |
| ⚙️ **Tooling** | `macOS-reset-26.4/deno.json` — `bundle`, `serve`, `start`; `compilerOptions.lib` includes DOM for client TS |

## 🗂️ Notable files (by role)

| Path | Role |
|------|------|
| `deno-md-server/main.ts` | HTTP handler: APIs + static `static/` |
| `deno-md-server/static/app.ts` | Shell: tree, content load, URL, FAB, hljs hook |
| `deno-md-server/static/file-tree.ts` | Sidebar tree model + render |
| `deno-md-server/static/file-search.ts` | Search/filter wiring |
| `deno-md-server/static/code-copy.ts` | Copy buttons + block toolbar metadata |
| `deno-md-server/static/highlight-code.ts` | highlight.js integration |
| `deno-md-server/static/*.css` | prose, tree, code toolbar, layout |
| `mds/**` | Curated / archived markdown content (+ `tmp1.md` sample) |
| `deno.json` / `deno.lock` | Tasks + lockfile at `macOS-reset-26.4/` |

## 🧪 How to run (after checkout)

  ┌──────────────────────────────────────────────┐
  │  cd macOS-reset-26.4                         │
  │  deno task bundle    # optional client       │
  │  deno task serve     # http://localhost:8000 │
  └──────────────────────────────────────────────┘

## 🧹 Housekeeping

- Removes obsolete `macOS-reset-26.4/tmp.md` in favor of structured content under `mds/`.
- Client is bundled to `static/app.js`; edit `*.ts` then `deno task bundle` when needed.
