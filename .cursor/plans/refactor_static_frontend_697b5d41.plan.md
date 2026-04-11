---
name: Refactor Static Frontend
overview: Refactor the markdown viewer frontend under `macOS-reset-26.4/deno-md-server/static` to improve directory structure and TypeScript architecture while preserving the current UI, allowing only minor UX polish. Keep `app.ts` and the TypeScript module graph as the editable source of truth, with `app.js` regenerated via the existing Deno bundle task.
todos:
  - id: map-current-responsibilities
    content: Break the current `app.ts` responsibilities into target modules and define the new static frontend structure.
    status: completed
  - id: extract-entrypoint-helpers
    content: Refactor `app.ts` into a thin bootstrap that delegates URL state, sidebar state, and content loading/rendering to helpers.
    status: completed
  - id: centralize-view-fragments
    content: Unify placeholder, loading, and error markup so the shell and runtime states use one source of truth.
    status: completed
  - id: keep-ui-stable
    content: Limit HTML/CSS changes to small polish and preserve current layout, API behavior, and sidebar/document navigation flows.
    status: completed
  - id: rebundle-and-verify
    content: Regenerate `app.js` from TypeScript and verify the core viewer interactions still behave correctly.
    status: completed
isProject: false
---

# Refactor Static Frontend

## Goal
Refactor the static frontend in [macOS-reset-26.4/deno-md-server/static](macOS-reset-26.4/deno-md-server/static) for cleaner structure and safer TypeScript architecture without materially changing the markdown viewer UI.

## Current Observations
- [macOS-reset-26.4/deno-md-server/static/app.ts](macOS-reset-26.4/deno-md-server/static/app.ts) currently mixes DOM lookup, URL state, sidebar persistence, content fetch/rendering, and navigation wiring in one entry file.
- [macOS-reset-26.4/deno-md-server/static/index.html](macOS-reset-26.4/deno-md-server/static/index.html) stays fairly small, but the UI contract is split across Tailwind utility classes plus [styles.css](macOS-reset-26.4/deno-md-server/static/styles.css), [layout.css](macOS-reset-26.4/deno-md-server/static/layout.css), and module-driven DOM class names.
- [macOS-reset-26.4/deno-md-server/static/file-tree.ts](macOS-reset-26.4/deno-md-server/static/file-tree.ts) and [file-search.ts](macOS-reset-26.4/deno-md-server/static/file-search.ts) already provide decent module boundaries, so the main opportunity is to split `app.ts` into smaller responsibilities instead of rewriting the whole frontend.
- [macOS-reset-26.4/deno.json](macOS-reset-26.4/deno.json) already defines `deno task bundle`, so [app.js](macOS-reset-26.4/deno-md-server/static/app.js) should be treated as a generated artifact rather than a hand-maintained source file.

## Proposed Refactor
- Create a clearer static frontend module layout under [macOS-reset-26.4/deno-md-server/static](macOS-reset-26.4/deno-md-server/static), centered around responsibilities such as app bootstrap, DOM access, URL/query state, sidebar state, content loading, and content rendering.
- Shrink [app.ts](macOS-reset-26.4/deno-md-server/static/app.ts) into a thin composition entry that wires together smaller helpers instead of owning every behavior directly.
- Consolidate repeated UI fragments like the loading, placeholder, and error states into shared render helpers so markup does not diverge between initial HTML and runtime updates.
- Preserve the existing CSS/HTML appearance, limiting changes to minor UX polish only where it naturally falls out of the cleanup.
- Regenerate [app.js](macOS-reset-26.4/deno-md-server/static/app.js) from the TypeScript entry using the existing bundle task after the refactor is complete.

## Likely File Touches
- [macOS-reset-26.4/deno-md-server/static/app.ts](macOS-reset-26.4/deno-md-server/static/app.ts)
- [macOS-reset-26.4/deno-md-server/static/index.html](macOS-reset-26.4/deno-md-server/static/index.html)
- [macOS-reset-26.4/deno-md-server/static/styles.css](macOS-reset-26.4/deno-md-server/static/styles.css)
- [macOS-reset-26.4/deno-md-server/static/layout.css](macOS-reset-26.4/deno-md-server/static/layout.css)
- Existing helpers such as [macOS-reset-26.4/deno-md-server/static/file-tree.ts](macOS-reset-26.4/deno-md-server/static/file-tree.ts) and [macOS-reset-26.4/deno-md-server/static/file-search.ts](macOS-reset-26.4/deno-md-server/static/file-search.ts)
- New small TS helper modules under [macOS-reset-26.4/deno-md-server/static](macOS-reset-26.4/deno-md-server/static) if needed

## Implementation Notes
- Keep the existing API surface unchanged: `/api/files`, `/api/search`, and `/api/content/...`.
- Preserve the current sidebar toggle behavior and URL query param behavior for `?file=`.
- Use TypeScript modules as the source of truth; do not manually maintain logic in [app.js](macOS-reset-26.4/deno-md-server/static/app.js).
- Verify the refactor by rebundling with the existing Deno task and checking the markdown viewer flows still work.

## Success Criteria
- `app.ts` becomes a small bootstrap file with responsibilities moved into focused helpers.
- Placeholder/loading/error rendering is centralized instead of duplicated in multiple branches.
- The UI and behavior remain effectively the same, aside from minor polish.
- `app.js` is regenerated from the TypeScript source tree and stays in sync with it.