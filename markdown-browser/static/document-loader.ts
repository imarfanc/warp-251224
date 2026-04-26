/// <reference path="./iconify-global.d.ts" />
import { enhanceProseCodeCopy } from "./components/code-copy/code-copy.ts";
import {
  enhanceHeadingSections,
  storageKeyForFile,
} from "./heading-sections.ts";
import { applySyntaxHighlight } from "./highlight-code.ts";
import { isFilesListPayload } from "./file-search.ts";
import type { FileTreeView } from "./components/file-tree/file-tree.ts";
import {
  renderChooseRootPlaceholder,
  renderContentError,
  renderContentFetchFailed,
  renderContentInvalidResponse,
  renderContentLoading,
  renderContentPlaceholder,
} from "./content-fragments.ts";
import { clearDocPath, setDocPathDisplay } from "./doc-path.ts";
import { buildFrontmatterMetaEl } from "./frontmatter-meta.ts";
import { getFileFromUrl, syncFileToUrl, type UrlSyncMode } from "./file-url.ts";

const DEFAULT_TITLE = "Markdown Viewer";

export type ContentResponse =
  | {
    html: string;
    title: string;
    kind?: "markdown" | "html";
    absolutePath?: string;
    frontmatter?: Record<string, unknown>;
    error?: undefined;
  }
  | { error: string; html?: undefined; title?: undefined };

function pageTitleFromFrontmatter(
  frontmatter: Record<string, unknown> | undefined,
): string | null {
  const t = frontmatter?.title;
  return typeof t === "string" && t.trim() !== "" ? t : null;
}

export type ViewerDom = {
  tree: FileTreeView;
  appMain: HTMLElement;
  contentShell: HTMLElement;
  contentBody: HTMLElement;
  docPathEl: HTMLElement;
};

type ErrorResponse = { error: string };

function isErrorResponse(data: unknown): data is ErrorResponse {
  return !!data && typeof data === "object" &&
    typeof (data as Record<string, unknown>).error === "string";
}

function titleForFile(path: string): string {
  return `${path} · ${DEFAULT_TITLE}`;
}

function isHtmlPath(path: string): boolean {
  return /\.html?$/i.test(path);
}

function showMarkdownShell(dom: ViewerDom): void {
  dom.appMain.classList.remove("app-main--html");
  if (dom.contentShell.parentElement !== dom.appMain) {
    dom.appMain.replaceChildren(dom.contentShell);
  }
}

function showHtmlMessage(
  dom: ViewerDom,
  message: string,
  className: string,
): void {
  const el = document.createElement("div");
  el.className = className;
  el.textContent = message;
  dom.appMain.classList.add("app-main--html");
  dom.appMain.replaceChildren(el);
}

function showHtmlDocument(dom: ViewerDom, html: string): void {
  const frame = document.createElement("iframe");
  frame.className = "html-document-frame";
  frame.title = "HTML preview";
  frame.sandbox.add("allow-same-origin", "allow-scripts", "allow-forms", "allow-popups");
  frame.srcdoc = html;
  dom.appMain.classList.add("app-main--html");
  dom.appMain.replaceChildren(frame);
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

  const htmlFile = isHtmlPath(file);
  if (htmlFile) {
    clearDocPath(docPathEl);
    showHtmlMessage(dom, "Loading...", "loading-msg");
  } else {
    showMarkdownShell(dom);
    setDocPathDisplay(docPathEl, file);
    renderContentLoading(contentBody);
    contentBody.setAttribute("aria-busy", "true");
  }

  try {
    const res = await fetch(
      `/api/content/${encodeURIComponent(file)}`,
    );
    const data = (await res.json()) as ContentResponse;

    if ("error" in data && data.error) {
      if (htmlFile) {
        showHtmlMessage(dom, `Error: ${data.error}`, "error-msg");
        syncFileToUrl(file, syncUrl);
        return;
      }
      renderContentError(contentBody, data.error);
      syncFileToUrl(file, syncUrl);
      return;
    }

    if (!data.html || data.title === undefined) {
      if (htmlFile) {
        showHtmlMessage(dom, "Error: invalid response", "error-msg");
        return;
      }
      renderContentInvalidResponse(contentBody);
      return;
    }

    syncFileToUrl(file, syncUrl);

    if (data.kind === "html") {
      document.title = titleForFile(data.title);
      clearDocPath(docPathEl);
      showHtmlDocument(dom, data.html);
      return;
    }

    showMarkdownShell(dom);

    const fmTitle = pageTitleFromFrontmatter(data.frontmatter);
    document.title = fmTitle
      ? `${fmTitle} · ${DEFAULT_TITLE}`
      : titleForFile(file);

    setDocPathDisplay(docPathEl, data.title, {
      absolutePath: data.absolutePath,
    });

    const prose = document.createElement("div");
    prose.className = "prose";
    prose.innerHTML = data.html;

    const hasDocumentH1 = prose.querySelector("h1") !== null;
    contentBody.replaceChildren();
    const resolvedMetaEl = buildFrontmatterMetaEl(data.frontmatter, {
      showTitle: !hasDocumentH1,
    });
    if (resolvedMetaEl) contentBody.appendChild(resolvedMetaEl);
    contentBody.appendChild(prose);
    enhanceProseCodeCopy(prose);
    enhanceHeadingSections(prose, { storageKey: storageKeyForFile(file) });
    applySyntaxHighlight(prose);
    Iconify.scan(contentBody);
  } catch {
    if (htmlFile) {
      showHtmlMessage(dom, "Error loading content", "error-msg");
      return;
    }
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
  const { tree, contentBody, docPathEl } = dom;
  try {
    const res = await fetch("/api/files");
    const data: unknown = await res.json();
    if (res.status === 409 && isErrorResponse(data)) {
      showMarkdownShell(dom);
      tree.loadPaths([], { emptyHint: "Choose a folder to begin." });
      tree.render();
      clearDocPath(docPathEl);
      renderChooseRootPlaceholder(contentBody);
      document.title = DEFAULT_TITLE;
      return;
    }
    if (!isFilesListPayload(data)) {
      tree.showListError();
      return;
    }
    const files = data.paths;

    tree.loadPaths(files, {
      emptyHint: files.length === 0
        ? "No markdown or HTML files found."
        : undefined,
      sortByPath: data.sort,
    });
    const fromUrl = getFileFromUrl();
    if (fromUrl) {
      tree.expandParentsForPath(fromUrl);
      tree.setSelectedPath(fromUrl);
      tree.render();
      await loadContent(dom, fromUrl, { syncUrl: "replace" });
    } else {
      showMarkdownShell(dom);
      tree.setSelectedPath(null);
      tree.render();
      clearDocPath(docPathEl);
      renderContentPlaceholder(contentBody);
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
      showMarkdownShell(dom);
      tree.setSelectedPath(null);
      tree.render();
      clearDocPath(docPathEl);
      renderContentPlaceholder(contentBody);
      document.title = DEFAULT_TITLE;
    }
  });
}
