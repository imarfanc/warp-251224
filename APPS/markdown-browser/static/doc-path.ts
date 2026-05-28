/// <reference path="./iconify-global.d.ts" />
import { CONFIG } from "./config.ts";

/**
 * VS Code–compatible hint: open in a **new** window instead of reusing the active Cursor window.
 * @see https://github.com/microsoft/vscode/pull/80260
 */
const CURSOR_NEW_WINDOW_QUERY = "?windowId=_blank";

/** Deep link handled by Cursor (same family as `cursor://file/...` in devtools / stack traces). */
export function hrefOpenInCursor(
    absolutePath: string,
    options?: { newWindow?: boolean },
): string {
    const normalized = absolutePath.replace(/\\/g, "/");
    let url = `cursor://file${encodeURI(normalized)}`;
    if (options?.newWindow) {
        url += CURSOR_NEW_WINDOW_QUERY;
    }
    return url;
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
    a.href = hrefOpenInCursor(absolutePath, { newWindow: true });
    a.setAttribute("aria-label", "Open project and file in Cursor");
    a.title = "Open project and file in Cursor";
    a.rel = "noopener noreferrer";
    a.addEventListener("click", async (e) => {
        if (
            e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey ||
            e.shiftKey || e.altKey
        ) {
            return;
        }
        e.preventDefault();
        try {
            const res = await fetch("/api/open-in-cursor", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ absolutePath }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null) as
                    | { error?: string }
                    | null;
                const message = data?.error ?? "Failed to open project in Cursor";
                window.alert(message);
            }
        } catch {
            window.alert("Failed to open project in Cursor");
        }
    });

    const icon = document.createElement("span");
    icon.className = "iconify";
    icon.setAttribute("data-icon", "simple-icons:cursor");
    icon.setAttribute("aria-hidden", "true");
    a.appendChild(icon);

    docPathEl.appendChild(a);
    Iconify.scan(a);
}

/** Reserved for “open parent folder in Finder” — UI slot only until wired again. */
function appendParentFolderPlaceholderButton(docPathEl: HTMLElement): void {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
        "doc-path__parent-folder-btn doc-path__parent-folder-btn--placeholder";
    btn.disabled = true;
    btn.setAttribute("aria-label", "Open parent folder — not available yet");
    btn.title = "Open parent folder — not available yet";

    const icon = document.createElement("span");
    icon.className = "iconify";
    icon.setAttribute("data-icon", "mdi:folder-outline");
    icon.setAttribute("aria-hidden", "true");
    btn.appendChild(icon);

    docPathEl.appendChild(btn);
    Iconify.scan(btn);
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
    appendParentFolderPlaceholderButton(docPathEl);
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
