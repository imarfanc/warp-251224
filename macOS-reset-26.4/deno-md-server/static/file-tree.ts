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

    constructor(
        private readonly container: HTMLElement,
        private readonly onSelectFile: (path: string) => void,
    ) {}

    loadPaths(relativePaths: string[], options?: LoadPathsOptions): void {
        this.root = { type: "dir", name: "", children: [] };
        relativePaths.forEach((f) => addFile(this.root, f.split("/"), f));
        const sortByPath = options?.sortByPath ?? {};
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
        this.container.innerHTML = "";
        if (this.root.children.length === 0) {
            const empty = document.createElement("div");
            empty.className = "file-tree__empty";
            empty.textContent = this.emptyHint ?? "No files.";
            this.container.appendChild(empty);
            return;
        }
        const wrap = document.createElement("div");
        wrap.className = "file-tree";
        for (const entry of this.root.children) {
            this.renderEntry(entry, wrap, "");
        }
        this.container.appendChild(wrap);
    }

    showListError(): void {
        this.container.innerHTML =
            '<div class="text-red-500">Error loading files</div>';
    }

    private renderEntry(
        entry: TreeEntry,
        parent: HTMLElement,
        parentPath: string,
    ): void {
        if (entry.type === "file") {
            const btn = document.createElement("button");
            btn.type = "button";
            const isSel = this.selectedPath === entry.path;
            btn.className = isSel
                ? "file-tree__file file-tree__file--active"
                : "file-tree__file";
            btn.textContent = entry.name;
            btn.title = entry.path;
            btn.onclick = () => this.onSelectFile(entry.path);
            parent.appendChild(btn);
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
            this.renderEntry(child, kids, key);
        }
        dirWrap.appendChild(kids);
        parent.appendChild(dirWrap);
    }
}
