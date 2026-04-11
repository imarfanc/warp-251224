/// <reference path="./iconify-global.d.ts" />
import { CONFIG } from "./config.ts";

export interface FileNode {
    type: "file";
    name: string;
    path: string;
}

export interface DirNode {
    type: "dir";
    name: string;
    children: TreeEntry[];
}

export type TreeEntry = DirNode | FileNode;

function addFile(root: DirNode, segments: string[], fullPath: string): void {
    if (segments.length === 1) {
        root.children.push({
            type: "file",
            name: segments[0],
            path: fullPath,
        });
        return;
    }
    const [first, ...rest] = segments;
    let dir = root.children.find(
        (c): c is DirNode => c.type === "dir" && c.name === first,
    );
    if (!dir) {
        dir = { type: "dir", name: first, children: [] };
        root.children.push(dir);
    }
    addFile(dir, rest, fullPath);
}

function fileSortKey(
    path: string,
    name: string,
    sortByPath: Record<string, number>,
): [number, string] {
    const s = sortByPath[path];
    const primary = typeof s === "number" && Number.isFinite(s)
        ? s
        : Number.POSITIVE_INFINITY;
    return [primary, name.toLowerCase()];
}

function compareFileOrder(
    a: FileNode,
    b: FileNode,
    sortByPath: Record<string, number>,
): number {
    const [pa, na] = fileSortKey(a.path, a.name, sortByPath);
    const [pb, nb] = fileSortKey(b.path, b.name, sortByPath);
    if (pa !== pb) return pa - pb;
    return na.localeCompare(nb, undefined, { sensitivity: "base" });
}

function sortTree(node: DirNode, sortByPath: Record<string, number>): void {
    node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        if (a.type === "file" && b.type === "file") {
            return compareFileOrder(a, b, sortByPath);
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    for (const c of node.children) {
        if (c.type === "dir") sortTree(c, sortByPath);
    }
}

function dirKey(parentPath: string, name: string): string {
    return parentPath ? `${parentPath}/${name}` : name;
}

function expandParentsIntoSet(filePath: string, expanded: Set<string>): void {
    const parts = filePath.split("/");
    for (let i = 0; i < parts.length - 1; i++) {
        expanded.add(parts.slice(0, i + 1).join("/"));
    }
}

function readPathSet(key: string): Set<string> {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.filter((x): x is string => typeof x === "string"));
    } catch {
        return new Set();
    }
}

function writePathSet(key: string, paths: Set<string>): void {
    try {
        localStorage.setItem(key, JSON.stringify([...paths]));
    } catch {
        /* ignore */
    }
}

function readPinnedPaths(): string[] {
    try {
        const raw = localStorage.getItem(CONFIG.fileTree.pinsStorageKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((x): x is string => typeof x === "string");
    } catch {
        return [];
    }
}

function writePinnedPaths(paths: string[]): void {
    try {
        localStorage.setItem(
            CONFIG.fileTree.pinsStorageKey,
            JSON.stringify(paths),
        );
    } catch {
        /* ignore */
    }
}

/** Pinned files sort before unpinned siblings in each folder. */
function reorderFilesForPins(
    node: DirNode,
    sortByPath: Record<string, number>,
    pinned: Set<string>,
): void {
    const dirs = node.children.filter((c): c is DirNode => c.type === "dir");
    const files = node.children.filter((c): c is FileNode => c.type === "file");
    const pinnedFiles = files.filter((f) => pinned.has(f.path));
    const unpinned = files.filter((f) => !pinned.has(f.path));
    pinnedFiles.sort((a, b) => compareFileOrder(a, b, sortByPath));
    unpinned.sort((a, b) => compareFileOrder(a, b, sortByPath));
    node.children = [...dirs, ...pinnedFiles, ...unpinned];
    for (const d of dirs) reorderFilesForPins(d, sortByPath, pinned);
}

export type LoadPathsOptions = {
    /** Keep this path selected if it appears in `relativePaths`. */
    preservePath?: string | null;
    /** Expand every folder that contains a listed file (e.g. search results). */
    expandAll?: boolean;
    /** Shown when `relativePaths` is empty (defaults to "No files."). */
    emptyHint?: string;
    /** Frontmatter `sort` (numeric) per relative path; files without an entry sort after, by name. */
    sortByPath?: Record<string, number>;
};

export class FileTreeView {
    private root: DirNode = { type: "dir", name: "", children: [] };
    private readonly expandedFolders = new Set<string>();
    private selectedPath: string | null = null;
    private emptyHint: string | null = null;
    private sortByPath: Record<string, number> = {};
    /** Paths from the last successful `loadPaths` (for the pinned strip). */
    private lastPaths: string[] = [];

    constructor(
        private readonly container: HTMLElement,
        private readonly onSelectFile: (path: string) => void,
        private readonly pinnedPanel: HTMLElement | null = null,
    ) {}

    loadPaths(relativePaths: string[], options?: LoadPathsOptions): void {
        this.lastPaths = [...relativePaths];
        this.root = { type: "dir", name: "", children: [] };
        relativePaths.forEach((f) => addFile(this.root, f.split("/"), f));
        const sortByPath = options?.sortByPath ?? {};
        this.sortByPath = sortByPath;
        sortTree(this.root, sortByPath);
        this.expandedFolders.clear();
        this.selectedPath = null;
        this.emptyHint = options?.emptyHint ?? null;

        const preserve = options?.preservePath;
        if (preserve && relativePaths.includes(preserve)) {
            this.selectedPath = preserve;
        }

        if (options?.expandAll) {
            for (const p of relativePaths) {
                expandParentsIntoSet(p, this.expandedFolders);
            }
        } else if (preserve && relativePaths.includes(preserve)) {
            expandParentsIntoSet(preserve, this.expandedFolders);
        }
    }

    getSelectedPath(): string | null {
        return this.selectedPath;
    }

    setSelectedPath(path: string | null): void {
        this.selectedPath = path;
    }

    expandParentsForPath(path: string): void {
        expandParentsIntoSet(path, this.expandedFolders);
    }

    render(): void {
        const pinnedPaths = readPinnedPaths();
        const pinned = new Set(pinnedPaths);
        const dimmed = readPathSet(CONFIG.fileTree.dimmedStorageKey);
        reorderFilesForPins(this.root, this.sortByPath, pinned);

        this.container.innerHTML = "";
        if (this.root.children.length === 0) {
            const empty = document.createElement("div");
            empty.className = "file-tree__empty";
            empty.textContent = this.emptyHint ?? "No files.";
            this.container.appendChild(empty);
            this.renderPinnedPanel(pinnedPaths, dimmed);
            return;
        }
        const wrap = document.createElement("div");
        wrap.className = "file-tree";
        for (const entry of this.root.children) {
            this.renderEntry(entry, wrap, "", pinned, dimmed);
        }
        this.container.appendChild(wrap);
        Iconify.scan(wrap);
        this.renderPinnedPanel(pinnedPaths, dimmed);
    }

    showListError(): void {
        this.container.innerHTML =
            '<div class="text-red-500">Error loading files</div>';
        if (this.pinnedPanel) {
            this.pinnedPanel.replaceChildren();
            this.pinnedPanel.hidden = true;
        }
    }

    private renderPinnedPanel(pinnedPaths: string[], dimmed: Set<string>): void {
        const panel = this.pinnedPanel;
        if (!panel) return;

        const known = new Set(this.lastPaths);
        const ordered = pinnedPaths.filter((p) => known.has(p));
        panel.replaceChildren();

        if (ordered.length === 0) {
            panel.hidden = true;
            return;
        }

        panel.hidden = false;

        const head = document.createElement("div");
        head.className = "sidebar-pinned__head";
        const icon = document.createElement("span");
        icon.className = "iconify sidebar-pinned__head-icon";
        icon.setAttribute("data-icon", "mdi:pin");
        icon.setAttribute("aria-hidden", "true");
        const title = document.createElement("div");
        title.className = "sidebar-pinned__title";
        title.textContent = "Pinned";
        head.append(icon, title);

        const list = document.createElement("div");
        list.className = "sidebar-pinned__list";
        for (const path of ordered) {
            const btn = document.createElement("button");
            btn.type = "button";
            const parts = path.split("/");
            const leaf = parts[parts.length - 1] ?? path;
            btn.textContent = leaf;
            btn.title = path;
            let cls = "sidebar-pinned__item";
            if (this.selectedPath === path) cls += " sidebar-pinned__item--active";
            if (dimmed.has(path)) cls += " sidebar-pinned__item--dimmed";
            btn.className = cls;
            btn.onclick = () => this.onSelectFile(path);
            list.appendChild(btn);
        }

        panel.append(head, list);
        Iconify.scan(panel);
    }

    private renderEntry(
        entry: TreeEntry,
        parent: HTMLElement,
        parentPath: string,
        pinned: Set<string>,
        dimmed: Set<string>,
    ): void {
        if (entry.type === "file") {
            const row = document.createElement("div");
            row.className = "file-tree__file-row";
            if (dimmed.has(entry.path)) {
                row.classList.add("file-tree__file-row--dimmed");
            }

            const pinBtn = document.createElement("button");
            pinBtn.type = "button";
            pinBtn.className = pinned.has(entry.path)
                ? "file-tree__icon-btn file-tree__icon-btn--active"
                : "file-tree__icon-btn";
            pinBtn.setAttribute("aria-label", pinned.has(entry.path) ? "Unpin file" : "Pin file to top");
            pinBtn.title = pinned.has(entry.path) ? "Unpin" : "Pin to top";
            const pinIcon = document.createElement("span");
            pinIcon.className = "iconify";
            pinIcon.setAttribute(
                "data-icon",
                pinned.has(entry.path) ? "mdi:pin" : "mdi:pin-outline",
            );
            pinIcon.setAttribute("aria-hidden", "true");
            pinBtn.appendChild(pinIcon);
            pinBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                let paths = readPinnedPaths();
                if (paths.includes(entry.path)) {
                    paths = paths.filter((p) => p !== entry.path);
                } else {
                    paths = [...paths, entry.path];
                }
                writePinnedPaths(paths);
                this.render();
            });

            const dimBtn = document.createElement("button");
            dimBtn.type = "button";
            dimBtn.className = dimmed.has(entry.path)
                ? "file-tree__icon-btn file-tree__icon-btn--active"
                : "file-tree__icon-btn";
            dimBtn.setAttribute(
                "aria-label",
                dimmed.has(entry.path) ? "Show file normally" : "Cross and blur file",
            );
            dimBtn.title = dimmed.has(entry.path) ? "Clear dim" : "Dim / blur";
            const dimIcon = document.createElement("span");
            dimIcon.className = "iconify";
            dimIcon.setAttribute(
                "data-icon",
                dimmed.has(entry.path) ? "mdi:eye-outline" : "mdi:blur",
            );
            dimIcon.setAttribute("aria-hidden", "true");
            dimBtn.appendChild(dimIcon);
            dimBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const set = readPathSet(CONFIG.fileTree.dimmedStorageKey);
                if (set.has(entry.path)) set.delete(entry.path);
                else set.add(entry.path);
                writePathSet(CONFIG.fileTree.dimmedStorageKey, set);
                this.render();
            });

            const btn = document.createElement("button");
            btn.type = "button";
            const isSel = this.selectedPath === entry.path;
            btn.className = isSel
                ? "file-tree__file file-tree__file--active"
                : "file-tree__file";
            btn.textContent = entry.name;
            btn.title = entry.path;
            btn.onclick = () => this.onSelectFile(entry.path);

            const actions = document.createElement("div");
            actions.className = "file-tree__file-actions";
            actions.append(pinBtn, dimBtn);

            row.append(btn, actions);
            parent.appendChild(row);
            return;
        }

        const key = dirKey(parentPath, entry.name);
        const isOpen = this.expandedFolders.has(key);

        const dirWrap = document.createElement("div");
        dirWrap.className = "file-tree__dir";

        const row = document.createElement("button");
        row.type = "button";
        row.className = "file-tree__folder";
        row.setAttribute("aria-expanded", isOpen ? "true" : "false");

        const chev = document.createElement("span");
        chev.className = "file-tree__chevron";
        chev.setAttribute("aria-hidden", "true");
        chev.textContent = isOpen ? "▼" : "▶";

        const label = document.createElement("span");
        label.className = "file-tree__folder-label truncate";
        label.textContent = entry.name;

        row.appendChild(chev);
        row.appendChild(label);
        row.onclick = () => {
            if (this.expandedFolders.has(key)) {
                this.expandedFolders.delete(key);
            } else {
                this.expandedFolders.add(key);
            }
            this.render();
        };

        dirWrap.appendChild(row);

        const kids = document.createElement("div");
        kids.className = "file-tree__children";
        if (!isOpen) kids.hidden = true;

        for (const child of entry.children) {
            this.renderEntry(child, kids, key, pinned, dimmed);
        }
        dirWrap.appendChild(kids);
        parent.appendChild(dirWrap);
    }
}
