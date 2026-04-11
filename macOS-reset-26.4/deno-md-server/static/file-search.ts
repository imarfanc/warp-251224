import type { FileTreeView } from "./file-tree.ts";

export type FilesListPayload = {
    paths: string[];
    sort?: Record<string, number>;
};

export function isFilesListPayload(data: unknown): data is FilesListPayload {
    if (!data || typeof data !== "object") return false;
    const o = data as Record<string, unknown>;
    if (!Array.isArray(o.paths) || !o.paths.every((x) => typeof x === "string")) {
        return false;
    }
    if (o.sort !== undefined) {
        if (typeof o.sort !== "object" || o.sort === null || Array.isArray(o.sort)) {
            return false;
        }
        for (const v of Object.values(o.sort)) {
            if (typeof v !== "number" || !Number.isFinite(v)) return false;
        }
    }
    return true;
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
        if (!isFilesListPayload(data)) {
            tree.showListError();
            return;
        }

        const files = data.paths;
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
            sortByPath: data.sort,
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
