import type { FileTreeView } from "./file-tree.ts";

export function isStringArray(data: unknown): data is string[] {
    return Array.isArray(data) && data.every((x) => typeof x === "string");
}

export async function refreshSidebarFileList(
    input: HTMLInputElement,
    tree: FileTreeView,
): Promise<void> {
    const q = input.value.trim();
    const endpoint = q
        ? `/api/search?q=${encodeURIComponent(q)}`
        : "/api/files";
    try {
        const res = await fetch(endpoint);
        const data: unknown = await res.json();
        if (!isStringArray(data)) {
            tree.showListError();
            return;
        }
        const files = data;
        const sel = tree.getSelectedPath();
        const keep = sel && files.includes(sel) ? sel : null;
        tree.loadPaths(files, {
            preservePath: keep,
            expandAll: q.length > 0,
            emptyHint: files.length === 0
                ? (q
                    ? "No files match your search."
                    : "No markdown files found.")
                : undefined,
        });
        tree.render();
    } catch {
        tree.showListError();
    }
}

const DEBOUNCE_MS = 300;

/** Debounced search/filter on `input`; calls {@link refreshSidebarFileList}. */
export function attachSidebarSearch(
    input: HTMLInputElement,
    tree: FileTreeView,
): void {
    let searchDebounce = 0;
    input.addEventListener("input", () => {
        window.clearTimeout(searchDebounce);
        searchDebounce = window.setTimeout(() => {
            void refreshSidebarFileList(input, tree);
        }, DEBOUNCE_MS);
    });
}
