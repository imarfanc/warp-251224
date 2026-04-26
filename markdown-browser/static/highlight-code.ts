/// <reference path="./hljs-global.d.ts" />

/**
 * `marked` may emit `class="language-bash:foo.sh"`; highlight.js expects `language-bash`.
 */
function normalizeLanguageClass(code: HTMLElement): void {
    const cls = code.getAttribute("class") ?? "";
    const m = cls.match(/\blanguage-([^:\s]+)(:[^\s]+)?\b/);
    if (m?.[2]) {
        const next = cls.replace(
            /\blanguage-[^\s]+/,
            `language-${m[1]}`,
        );
        code.setAttribute("class", next);
    }
}

/** Syntax-highlight every `pre > code` under `root` (highlight.js). */
export function applySyntaxHighlight(root: HTMLElement): void {
    if (typeof hljs === "undefined" || !hljs.highlightElement) return;

    for (const node of root.querySelectorAll("pre > code")) {
        if (!(node instanceof HTMLElement)) continue;
        normalizeLanguageClass(node);
        try {
            hljs.highlightElement(node);
        } catch {
            /* unknown or empty block */
        }
    }
}
