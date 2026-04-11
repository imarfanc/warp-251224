/// <reference path="./iconify-global.d.ts" />
import { enhanceProseCodeCopy } from "./code-copy.ts";
import {
    enhanceHeadingSections,
    storageKeyForFile,
} from "./heading-sections.ts";
import { applySyntaxHighlight } from "./highlight-code.ts";
import { isStringArray } from "./file-search.ts";
import type { FileTreeView } from "./file-tree.ts";
import {
    renderContentError,
    renderContentFetchFailed,
    renderContentInvalidResponse,
    renderContentLoading,
    renderContentPlaceholder,
} from "./content-fragments.ts";
import { clearDocPath, setDocPathDisplay } from "./doc-path.ts";
import { getFileFromUrl, syncFileToUrl, type UrlSyncMode } from "./file-url.ts";

const DEFAULT_TITLE = "Markdown Viewer";

export type ContentResponse =
    | { html: string; title: string; absolutePath?: string; error?: undefined }
    | { error: string; html?: undefined; title?: undefined };

export type ViewerDom = {
    tree: FileTreeView;
    contentBody: HTMLElement;
    docPathEl: HTMLElement;
};

function titleForFile(path: string): string {
    return `${path} · ${DEFAULT_TITLE}`;
}

export async function loadContent(
    dom: ViewerDom,
    file: string,
    opts: { syncUrl?: UrlSyncMode } = {},
): Promise<void> {
    const { tree, contentBody, docPathEl } = dom;
    const syncUrl = opts.syncUrl ?? "push";

    tree.setSelectedPath(file);
    tree.render();

    document.title = titleForFile(file);

    setDocPathDisplay(docPathEl, file);
    renderContentLoading(contentBody);
    contentBody.setAttribute("aria-busy", "true");

    try {
        const res = await fetch(
            `/api/content/${encodeURIComponent(file)}`,
        );
        const data = (await res.json()) as ContentResponse;

        if ("error" in data && data.error) {
            renderContentError(contentBody, data.error);
            syncFileToUrl(file, syncUrl);
            return;
        }

        if (!data.html || data.title === undefined) {
            renderContentInvalidResponse(contentBody);
            return;
        }

        syncFileToUrl(file, syncUrl);

        setDocPathDisplay(docPathEl, data.title, {
            absolutePath: data.absolutePath,
        });

        const prose = document.createElement("div");
        prose.className = "prose prose-slate max-w-none";
        prose.innerHTML = data.html;

        contentBody.replaceChildren(prose);
        enhanceProseCodeCopy(prose);
        enhanceHeadingSections(prose, { storageKey: storageKeyForFile(file) });
        applySyntaxHighlight(prose);
        Iconify.scan(prose);
    } catch {
        renderContentFetchFailed(contentBody);
    } finally {
        contentBody.removeAttribute("aria-busy");
    }
}

export async function selectFile(dom: ViewerDom, path: string): Promise<void> {
    dom.tree.expandParentsForPath(path);
    await loadContent(dom, path, { syncUrl: "push" });
}

export async function loadInitialFileList(dom: ViewerDom): Promise<void> {
    const { tree } = dom;
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
            await loadContent(dom, fromUrl, { syncUrl: "replace" });
        } else {
            tree.setSelectedPath(null);
            tree.render();
            document.title = DEFAULT_TITLE;
        }
    } catch {
        tree.showListError();
    }
}

export function registerPopstateHandler(dom: ViewerDom): void {
    const { tree, contentBody, docPathEl } = dom;

    window.addEventListener("popstate", () => {
        const f = getFileFromUrl();
        if (f) {
            tree.expandParentsForPath(f);
            tree.setSelectedPath(f);
            tree.render();
            void loadContent(dom, f, { syncUrl: "none" });
        } else {
            tree.setSelectedPath(null);
            tree.render();
            clearDocPath(docPathEl);
            renderContentPlaceholder(contentBody);
            document.title = DEFAULT_TITLE;
        }
    });
}
