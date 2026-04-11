---
name: add h2 controls
overview: Add per-`h2` collapse and blur buttons to the markdown viewer, modeled on the reference implementation in `vt/VALS/md` and integrated into the existing post-render enhancement flow.
todos:
  - id: add-heading-enhancer
    content: Create a new markdown heading enhancer that appends collapse/blur buttons to each rendered `h2` and groups section content under a wrapper.
    status: completed
  - id: wire-loader
    content: Call the new enhancer from `document-loader.ts` in the same post-render phase as code copy and syntax highlighting.
    status: completed
  - id: style-controls
    content: Add `.prose h2` and section-state CSS for inline buttons, collapsed sections, and blurred sections.
    status: completed
  - id: verify-behavior
    content: Verify buttons render beside `h2`, section boundaries are correct, and state persists across reloads without duplicate wrappers.
    status: completed
isProject: false
---

# Add H2 Collapse/Blur Controls

## Approach
Implement this as a client-side markdown enhancement in the static viewer under [macOS-reset-26.4/deno-md-server/static/document-loader.ts](macOS-reset-26.4/deno-md-server/static/document-loader.ts), not in server-side markdown rendering. That matches the current architecture: markdown HTML is injected into `.prose`, then DOM enhancers run on the rendered content.

Relevant existing hook:

```70:77:macOS-reset-26.4/deno-md-server/static/document-loader.ts
const prose = document.createElement("div");
prose.className = "prose prose-slate max-w-none";
prose.innerHTML = data.html;

contentBody.replaceChildren(prose);
enhanceProseCodeCopy(prose);
applySyntaxHighlight(prose);
Iconify.scan(prose);
```

Reference behavior to mirror from `vt/VALS/md`:

```311:344:/Users/arfan2/Developer/gh/vt/VALS/md/src/markdown-sections.ts
const headings = Array.from(root.querySelectorAll("h2"));
...
heading.classList.add("md-h2");
...
heading.appendChild(collapseButton);
heading.appendChild(blurButton);

const body = document.createElement("div");
body.className = "md-section-body";
...
```

## Planned Changes
- Add a new static module such as [macOS-reset-26.4/deno-md-server/static/heading-sections.ts](macOS-reset-26.4/deno-md-server/static/heading-sections.ts) that:
  - finds all `.prose h2` headings,
  - appends two buttons to each heading,
  - wraps following siblings into a section body until the next `h2`,
  - toggles `is-collapsed` and `is-blurred` classes,
  - stores per-section state in `localStorage` using a deterministic key based on the current document path + heading slug/index,
  - exposes cleanup/idempotent behavior so reloading a different document does not double-wrap content.
- Wire the enhancer into [macOS-reset-26.4/deno-md-server/static/document-loader.ts](macOS-reset-26.4/deno-md-server/static/document-loader.ts) immediately after `prose.innerHTML = data.html` and alongside the existing code-copy enhancement.
- Extend [macOS-reset-26.4/deno-md-server/static/styles.css](macOS-reset-26.4/deno-md-server/static/styles.css) so `.prose h2` can host inline action buttons without breaking the existing heading look. Add styles for:
  - shared `h2` action buttons,
  - collapsed section body (`display: none`),
  - blurred section body (`filter: blur(...)` and no pointer events),
  - active/inactive visual states for the two controls.

## Notes
- This should stay source-first in TypeScript/CSS and avoid editing any built artifact directly.
- The existing code-copy enhancer in [macOS-reset-26.4/deno-md-server/static/code-copy.ts](macOS-reset-26.4/deno-md-server/static/code-copy.ts) is the best implementation pattern to follow for DOM mutation and idempotent enhancement.
- Styling can stay close to the reference, but should be adjusted to match the viewer’s current `.prose` typography and button palette in [macOS-reset-26.4/deno-md-server/static/styles.css](macOS-reset-26.4/deno-md-server/static/styles.css).