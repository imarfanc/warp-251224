/// <reference path="./iconify-global.d.ts" />
import { CONFIG } from "./config.ts";

/** Deep link handled by Cursor (same family as `cursor://file/...` in devtools / stack traces). */
export function hrefOpenInCursor(absolutePath: string): string {
    const normalized = absolutePath.replace(/\\/g, "/");
    return `cursor://file${encodeURI(normalized)}`;
}

/** Deep link for Marked 2 (`x-marked://open?file=…`). */
export function hrefOpenInMarked(absolutePath: string): string {
    const normalized = absolutePath.replace(/\\/g, "/");
    return `${CONFIG.marked.openBase}?file=${encodeURIComponent(normalized)}`;
}

function appendOpenInCursorButton(
    docPathEl: HTMLElement,
    absolutePath: string,
): void {
    const a = document.createElement("a");
    a.className = "doc-path__cursor-btn";
    a.href = hrefOpenInCursor(absolutePath);
    a.setAttribute("aria-label", "Open file in Cursor");
    a.title = "Open in Cursor";
    a.rel = "noopener noreferrer";

    const icon = document.createElement("span");
    icon.className = "iconify";
    icon.setAttribute("data-icon", "simple-icons:cursor");
    icon.setAttribute("aria-hidden", "true");
    a.appendChild(icon);

    docPathEl.appendChild(a);
    Iconify.scan(a);
}

function appendOpenInMarkedButton(
    docPathEl: HTMLElement,
    absolutePath: string,
): void {
    const a = document.createElement("a");
    a.className = "doc-path__marked-btn";
    a.href = hrefOpenInMarked(absolutePath);
    a.setAttribute("aria-label", "Open file in Marked");
    a.title = "Open in Marked";
    a.rel = "noopener noreferrer";

    const icon = document.createElement("span");
    icon.className = "iconify";
    icon.setAttribute("data-icon", "mdi:language-markdown");
    icon.setAttribute("aria-hidden", "true");
    a.appendChild(icon);

    docPathEl.appendChild(a);
    Iconify.scan(a);
}

function appendDocPathAppButtons(
    docPathEl: HTMLElement,
    absolutePath: string,
): void {
    appendOpenInCursorButton(docPathEl, absolutePath);
    appendOpenInMarkedButton(docPathEl, absolutePath);
}

export type DocPathOptions = {
    /** Host filesystem path from `/api/content/...` (used for Cursor deep link). */
    absolutePath?: string;
};

/** Render path like `1 > brew.md` with folder crumbs vs filename colors. */
export function setDocPathDisplay(
    docPathEl: HTMLElement,
    path: string,
    options?: DocPathOptions,
): void {
    docPathEl.replaceChildren();
    const absolutePath = options?.absolutePath;

    const parts = path.split("/").filter((p) => p.length > 0);
    if (parts.length === 0) {
        const fallback = document.createElement("span");
        fallback.className = "doc-path__leaf";
        fallback.textContent = path;
        docPathEl.appendChild(fallback);
        if (absolutePath) {
            appendDocPathAppButtons(docPathEl, absolutePath);
        }
        docPathEl.classList.remove("hidden");
        return;
    }
    for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
            docPathEl.appendChild(document.createTextNode(" "));
            const sep = document.createElement("span");
            sep.className = "doc-path__sep";
            sep.textContent = ">";
            sep.setAttribute("aria-hidden", "true");
            docPathEl.appendChild(sep);
            docPathEl.appendChild(document.createTextNode(" "));
        }
        const span = document.createElement("span");
        span.className = i === parts.length - 1
            ? "doc-path__leaf"
            : "doc-path__crumb";
        span.textContent = parts[i];
        docPathEl.appendChild(span);

        const isLeaf = i === parts.length - 1;
        if (isLeaf && absolutePath) {
            appendDocPathAppButtons(docPathEl, absolutePath);
        }
    }
    docPathEl.classList.remove("hidden");
}

export function clearDocPath(docPathEl: HTMLElement): void {
    docPathEl.textContent = "";
    docPathEl.classList.add("hidden");
}
