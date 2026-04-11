/// <reference path="./iconify-global.d.ts" />
import { enhanceProseCodeCopy } from "./code-copy.ts";
import { applySyntaxHighlight } from "./highlight-code.ts";
import { attachSidebarSearch, isStringArray } from "./file-search.ts";
import { FileTreeView } from "./file-tree.ts";

function getEl(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing required element: #${id}`);
    return el;
}

const fileListEl = getEl("file-list");
const contentEl = getEl("content");
const fileSearchInput = getEl("file-search") as HTMLInputElement;
const sidebarFab = getEl("sidebar-fab") as HTMLButtonElement;

const SIDEBAR_HIDDEN_KEY = "deno-md-viewer-sidebar-hidden";

const FILE_QUERY = "file";

type ContentResponse =
    | { html: string; title: string; error?: undefined }
    | { error: string; html?: undefined; title?: undefined };

function getFileFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    const f = params.get(FILE_QUERY);
    return f && f.length > 0 ? f : null;
}

function setFileInUrl(file: string, replace: boolean): void {
    const url = new URL(window.location.href);
    url.searchParams.set(FILE_QUERY, file);
    history[replace ? "replaceState" : "pushState"]({}, "", url);
}

const tree = new FileTreeView(fileListEl, (path) => {
    void selectFile(path);
});

attachSidebarSearch(fileSearchInput, tree);

function updateSidebarFabUi(hidden: boolean): void {
    const icon = sidebarFab.querySelector(".iconify");
    if (icon) {
        icon.setAttribute("data-icon", hidden ? "mdi:chevron-right" : "mdi:chevron-left");
    }
    const label = hidden ? "Show sidebar" : "Hide sidebar";
    sidebarFab.setAttribute("aria-label", label);
    sidebarFab.title = label;
    Iconify.scan(sidebarFab);
}

function applySidebarHidden(hidden: boolean): void {
    document.body.classList.toggle("sidebar-hidden", hidden);
    try {
        localStorage.setItem(SIDEBAR_HIDDEN_KEY, hidden ? "1" : "");
    } catch {
        /* ignore */
    }
    updateSidebarFabUi(hidden);
}

function initSidebarFab(): void {
    let hidden = false;
    try {
        hidden = localStorage.getItem(SIDEBAR_HIDDEN_KEY) === "1";
    } catch {
        /* ignore */
    }
    applySidebarHidden(hidden);

    sidebarFab.addEventListener("click", () => {
        applySidebarHidden(!document.body.classList.contains("sidebar-hidden"));
    });
}

initSidebarFab();

async function loadContent(
    file: string,
    opts: { syncUrl?: "push" | "replace" | "none" } = {},
): Promise<void> {
    const syncUrl = opts.syncUrl ?? "push";
    tree.setSelectedPath(file);
    tree.render();

    document.title = `${file} · Markdown Viewer`;

    contentEl.innerHTML =
        '<div class="animate-pulse text-gray-400">Loading...</div>';
    try {
        const res = await fetch(
            `/api/content/${encodeURIComponent(file)}`,
        );
        const data = (await res.json()) as ContentResponse;

        if ("error" in data && data.error) {
            contentEl.innerHTML =
                `<div class="text-red-500">Error: ${escapeHtml(data.error)}</div>`;
            if (syncUrl === "push") setFileInUrl(file, false);
            else if (syncUrl === "replace") setFileInUrl(file, true);
            return;
        }

        if (!data.html || data.title === undefined) {
            contentEl.innerHTML =
                '<div class="text-red-500">Error: invalid response</div>';
            return;
        }

        if (syncUrl === "push") setFileInUrl(file, false);
        else if (syncUrl === "replace") setFileInUrl(file, true);

        const title = document.createElement("h1");
        title.className =
            "text-3xl font-bold mb-6 border-b pb-4 text-gray-900";
        title.textContent = data.title;

        const prose = document.createElement("div");
        prose.className = "prose prose-slate max-w-none";
        prose.innerHTML = data.html;

        contentEl.innerHTML = "";
        contentEl.appendChild(title);
        contentEl.appendChild(prose);
        enhanceProseCodeCopy(prose);
        applySyntaxHighlight(prose);
        Iconify.scan(prose);
    } catch {
        contentEl.innerHTML =
            '<div class="text-red-500">Error loading content</div>';
    }
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

async function selectFile(path: string): Promise<void> {
    tree.expandParentsForPath(path);
    await loadContent(path, { syncUrl: "push" });
}

async function loadFiles(): Promise<void> {
    try {
        const res = await fetch("/api/files");
        const data: unknown = await res.json();
        if (!isStringArray(data)) {
            tree.showListError();
            return;
        }
        const files = data;

        tree.loadPaths(files, {
            emptyHint: files.length === 0 ? "No markdown files found." : undefined,
        });
        const fromUrl = getFileFromUrl();
        if (fromUrl) {
            tree.expandParentsForPath(fromUrl);
            tree.setSelectedPath(fromUrl);
            tree.render();
            await loadContent(fromUrl, { syncUrl: "replace" });
        } else {
            tree.setSelectedPath(null);
            tree.render();
            document.title = "Markdown Viewer";
        }
    } catch {
        tree.showListError();
    }
}

window.addEventListener("popstate", () => {
    const f = getFileFromUrl();
    if (f) {
        tree.expandParentsForPath(f);
        tree.setSelectedPath(f);
        tree.render();
        void loadContent(f, { syncUrl: "none" });
    } else {
        tree.setSelectedPath(null);
        tree.render();
        contentEl.innerHTML =
            '<div class="text-gray-400 italic">Select a file from the sidebar to view its content.</div>';
        document.title = "Markdown Viewer";
    }
});

void loadFiles();
