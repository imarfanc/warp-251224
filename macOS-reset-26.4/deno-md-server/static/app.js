// deno-md-server/static/file-search.ts
function isStringArray(data) {
  return Array.isArray(data) && data.every((x) => typeof x === "string");
}
async function refreshSidebarFileList(input, tree2) {
  const q = input.value.trim();
  const endpoint = q ? `/api/search?q=${encodeURIComponent(q)}` : "/api/files";
  try {
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!isStringArray(data)) {
      tree2.showListError();
      return;
    }
    const files = data;
    const sel = tree2.getSelectedPath();
    const keep = sel && files.includes(sel) ? sel : null;
    tree2.loadPaths(files, {
      preservePath: keep,
      expandAll: q.length > 0,
      emptyHint: files.length === 0 ? q ? "No files match your search." : "No markdown files found." : void 0
    });
    tree2.render();
  } catch {
    tree2.showListError();
  }
}
var DEBOUNCE_MS = 300;
function attachSidebarSearch(input, tree2) {
  let searchDebounce = 0;
  input.addEventListener("input", () => {
    window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(() => {
      void refreshSidebarFileList(input, tree2);
    }, DEBOUNCE_MS);
  });
}

// deno-md-server/static/file-tree.ts
function addFile(root, segments, fullPath) {
  if (segments.length === 1) {
    root.children.push({
      type: "file",
      name: segments[0],
      path: fullPath
    });
    return;
  }
  const [first, ...rest] = segments;
  let dir = root.children.find((c) => c.type === "dir" && c.name === first);
  if (!dir) {
    dir = {
      type: "dir",
      name: first,
      children: []
    };
    root.children.push(dir);
  }
  addFile(dir, rest, fullPath);
}
function sortTree(node) {
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, void 0, {
      sensitivity: "base"
    });
  });
  for (const c of node.children) {
    if (c.type === "dir") sortTree(c);
  }
}
function dirKey(parentPath, name) {
  return parentPath ? `${parentPath}/${name}` : name;
}
function expandParentsIntoSet(filePath, expanded) {
  const parts = filePath.split("/");
  for (let i = 0; i < parts.length - 1; i++) {
    expanded.add(parts.slice(0, i + 1).join("/"));
  }
}
var FileTreeView = class {
  container;
  onSelectFile;
  root;
  expandedFolders;
  selectedPath;
  emptyHint;
  constructor(container, onSelectFile) {
    this.container = container;
    this.onSelectFile = onSelectFile;
    this.root = {
      type: "dir",
      name: "",
      children: []
    };
    this.expandedFolders = /* @__PURE__ */ new Set();
    this.selectedPath = null;
    this.emptyHint = null;
  }
  loadPaths(relativePaths, options) {
    this.root = {
      type: "dir",
      name: "",
      children: []
    };
    relativePaths.forEach((f) => addFile(this.root, f.split("/"), f));
    sortTree(this.root);
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
  getSelectedPath() {
    return this.selectedPath;
  }
  setSelectedPath(path) {
    this.selectedPath = path;
  }
  expandParentsForPath(path) {
    expandParentsIntoSet(path, this.expandedFolders);
  }
  render() {
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
  showListError() {
    this.container.innerHTML = '<div class="text-red-500">Error loading files</div>';
  }
  renderEntry(entry, parent, parentPath) {
    if (entry.type === "file") {
      const btn = document.createElement("button");
      btn.type = "button";
      const isSel = this.selectedPath === entry.path;
      btn.className = isSel ? "file-tree__file file-tree__file--active" : "file-tree__file";
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
    chev.textContent = isOpen ? "\u25BC" : "\u25B6";
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
};

// deno-md-server/static/dom.ts
function getEl(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required element: #${id}`);
  return el;
}

// deno-md-server/static/sidebar-fab.ts
var SIDEBAR_HIDDEN_KEY = "deno-md-viewer-sidebar-hidden";
function updateSidebarFabUi(sidebarFab2, hidden) {
  const icon = sidebarFab2.querySelector(".iconify");
  if (icon) {
    icon.setAttribute("data-icon", hidden ? "mdi:chevron-right" : "mdi:chevron-left");
  }
  const label = hidden ? "Show sidebar" : "Hide sidebar";
  sidebarFab2.setAttribute("aria-label", label);
  sidebarFab2.title = label;
  Iconify.scan(sidebarFab2);
}
function applySidebarHidden(sidebarFab2, hidden) {
  document.body.classList.toggle("sidebar-hidden", hidden);
  try {
    localStorage.setItem(SIDEBAR_HIDDEN_KEY, hidden ? "1" : "");
  } catch {
  }
  updateSidebarFabUi(sidebarFab2, hidden);
}
function initSidebarFab(sidebarFab2) {
  let hidden = false;
  try {
    hidden = localStorage.getItem(SIDEBAR_HIDDEN_KEY) === "1";
  } catch {
  }
  applySidebarHidden(sidebarFab2, hidden);
  sidebarFab2.addEventListener("click", () => {
    applySidebarHidden(sidebarFab2, !document.body.classList.contains("sidebar-hidden"));
  });
}

// deno-md-server/static/code-copy.ts
var COPY_ICON = "mdi:content-copy";
var CHECK_ICON = "mdi:check";
function parseCodeBlockClass(code) {
  const cls = code.getAttribute("class") ?? "";
  const m = cls.match(/\blanguage-([^\s]+)/);
  if (!m) return {
    langId: null,
    fenceFilename: null
  };
  const raw = m[1];
  const colon = raw.indexOf(":");
  if (colon > 0) {
    const langPart = raw.slice(0, colon).toLowerCase();
    const filePart = raw.slice(colon + 1).trim();
    if (filePart.length > 0 && (/\.[a-zA-Z0-9]{1,12}$/.test(filePart) || /[./\\]/.test(filePart))) {
      if (langPart === "none" || langPart === "no-highlight") {
        return {
          langId: null,
          fenceFilename: filePart
        };
      }
      return {
        langId: langPart,
        fenceFilename: filePart
      };
    }
  }
  const id = raw.toLowerCase();
  if (id === "none" || id === "no-highlight") {
    return {
      langId: null,
      fenceFilename: null
    };
  }
  return {
    langId: id,
    fenceFilename: null
  };
}
function extractFilenameHint(source) {
  const lines = source.split(/\r\n|\r|\n/).slice(0, 12);
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const m1 = t.match(/^(?:\/\/|#)\s*(?:file|path|filename)\s*:\s*(.+)$/i);
    if (m1) return m1[1].trim();
    const m2 = t.match(/^\/\*\s*(?:file|path|filename)\s*:\s*(.+?)\s*\*\/$/i);
    if (m2) return m2[1].trim();
  }
  const first = lines.find((l) => l.trim().length > 0)?.trim() ?? "";
  if (/^[\w./\\~-]+\.[a-zA-Z0-9]{1,12}$/.test(first) && !first.includes(" ")) {
    return first;
  }
  return null;
}
function countLines(source) {
  const trimmed = source.replace(/(?:\r\n|\r|\n)+$/, "");
  if (trimmed.length === 0) {
    return source.length === 0 ? 0 : 1;
  }
  return trimmed.split(/\r\n|\r|\n/).length;
}
function formatLineCount(n) {
  if (n === 0) return "0 lines";
  if (n === 1) return "1 line";
  return `${n} lines`;
}
function setIconifyIcon(el, icon) {
  if (!el || !el.classList.contains("iconify")) return;
  el.setAttribute("data-icon", icon);
}
async function copyText(text, button, mode) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    return;
  }
  const iconEl = button.querySelector(".iconify");
  const label = button.querySelector(".code-copy__label");
  const prevIcon = iconEl?.getAttribute("data-icon") ?? COPY_ICON;
  const prevLabel = label?.textContent;
  setIconifyIcon(iconEl, CHECK_ICON);
  if (mode === "block" && label) label.textContent = "Copied";
  button.disabled = true;
  Iconify.scan(button);
  window.setTimeout(() => {
    setIconifyIcon(iconEl, prevIcon);
    if (mode === "block" && label) {
      label.textContent = prevLabel ?? "Copy";
    }
    button.disabled = false;
    Iconify.scan(button);
  }, 1600);
}
function makeIconSpan(icon) {
  const s = document.createElement("span");
  s.className = "iconify";
  s.setAttribute("data-icon", icon);
  return s;
}
function enhanceCodeBlocks(prose) {
  const pres = prose.querySelectorAll("pre");
  for (const pre of pres) {
    if (pre.closest(".code-block-wrap")) continue;
    const code = pre.querySelector("code");
    const source = code?.textContent ?? pre.textContent ?? "";
    const wrap = document.createElement("div");
    wrap.className = "code-block-wrap";
    const toolbar = document.createElement("div");
    toolbar.className = "code-block-toolbar";
    const meta = document.createElement("div");
    meta.className = "code-block-meta";
    const { langId, fenceFilename } = code ? parseCodeBlockClass(code) : {
      langId: null,
      fenceFilename: null
    };
    const langEl = document.createElement("span");
    langEl.className = "code-block-lang";
    langEl.textContent = langId ?? "text";
    meta.appendChild(langEl);
    const filename = fenceFilename ?? extractFilenameHint(source);
    if (filename) {
      const sep1 = document.createElement("span");
      sep1.className = "code-block-meta-sep";
      sep1.setAttribute("aria-hidden", "true");
      sep1.textContent = "\xB7";
      const fnEl = document.createElement("span");
      fnEl.className = "code-block-filename";
      fnEl.textContent = filename;
      fnEl.title = filename;
      meta.append(sep1, fnEl);
    }
    const sepLines = document.createElement("span");
    sepLines.className = "code-block-meta-sep";
    sepLines.setAttribute("aria-hidden", "true");
    sepLines.textContent = "\xB7";
    const linesEl = document.createElement("span");
    linesEl.className = "code-block-lines";
    linesEl.textContent = formatLineCount(countLines(source));
    meta.append(sepLines, linesEl);
    const actions = document.createElement("div");
    actions.className = "code-block-actions";
    const runBtn = document.createElement("button");
    runBtn.type = "button";
    runBtn.className = "code-run-btn code-block-action-btn";
    runBtn.disabled = true;
    runBtn.setAttribute("aria-label", "Run code (coming soon)");
    runBtn.title = "Run (coming soon)";
    runBtn.append(makeIconSpan("mdi:play"), (() => {
      const s = document.createElement("span");
      s.className = "code-block-action__text";
      s.textContent = "Run";
      return s;
    })());
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "code-copy-btn code-copy-btn--block code-block-action-btn";
    copyBtn.setAttribute("aria-label", "Copy code");
    const copyIcon = makeIconSpan(COPY_ICON);
    const label = document.createElement("span");
    label.className = "code-copy__label";
    label.textContent = "Copy";
    copyBtn.append(copyIcon, label);
    copyBtn.addEventListener("click", () => {
      const c = pre.querySelector("code");
      const text = c?.textContent ?? pre.textContent ?? "";
      void copyText(text, copyBtn, "block");
    });
    actions.append(runBtn, copyBtn);
    toolbar.append(meta, actions);
    pre.parentNode?.insertBefore(wrap, pre);
    wrap.append(toolbar, pre);
  }
}
function enhanceInlineCode(prose) {
  const codes = prose.querySelectorAll("code");
  for (const code of codes) {
    if (code.closest("pre")) continue;
    if (code.closest(".inline-code-wrap")) continue;
    if (!code.textContent?.trim()) continue;
    const wrap = document.createElement("span");
    wrap.className = "inline-code-wrap";
    const parent = code.parentNode;
    if (!parent) continue;
    parent.insertBefore(wrap, code);
    wrap.appendChild(code);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy-btn code-copy-btn--inline";
    btn.setAttribute("aria-label", "Copy snippet");
    btn.appendChild(makeIconSpan(COPY_ICON));
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = code.textContent ?? "";
      void copyText(text, btn, "inline");
    });
    wrap.appendChild(btn);
  }
}
function enhanceProseCodeCopy(prose) {
  enhanceCodeBlocks(prose);
  enhanceInlineCode(prose);
}

// deno-md-server/static/heading-sections.ts
var STORAGE_PREFIX = "md-viewer:sections";
function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "section";
}
function boolFromStorage(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
function writeBoolToStorage(key, value) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
  }
}
function keyFor(storageKey, sectionKey, field) {
  return `${storageKey}:${sectionKey}:${field}`;
}
var COLLAPSE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M18 15l-6-6-6 6"/></svg>';
var BLUR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 21a9 9 0 1 0 0 -18a9 9 0 0 0 0 18z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3a9 9 0 0 1 0 18"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/></svg>';
function enhanceHeadingSections(prose, options) {
  const storageKey = options.storageKey;
  const root = prose;
  const prevCleanup = root.__headingSectionsCleanup;
  if (typeof prevCleanup === "function") {
    prevCleanup();
  }
  const headings = Array.from(prose.querySelectorAll("h2"));
  if (headings.length === 0) {
    root.__headingSectionsCleanup = void 0;
    return;
  }
  const detach = [];
  const sections = [];
  function on(target, type, handler, opts) {
    target.addEventListener(type, handler, opts);
    detach.push(() => target.removeEventListener(type, handler, opts));
  }
  headings.forEach((heading, index) => {
    if (heading.querySelector(".md-h2-collapse-btn")) {
      return;
    }
    const sectionKey = `${slugify(heading.textContent ?? "")}-${index}`;
    heading.classList.add("md-h2");
    heading.dataset.mdSectionKey = sectionKey;
    const collapseButton = document.createElement("button");
    collapseButton.type = "button";
    collapseButton.className = "md-h2-action-btn md-h2-collapse-btn";
    collapseButton.setAttribute("aria-label", "Collapse heading");
    collapseButton.innerHTML = COLLAPSE_SVG;
    const blurButton = document.createElement("button");
    blurButton.type = "button";
    blurButton.className = "md-h2-action-btn md-h2-blur-btn";
    blurButton.setAttribute("aria-label", "Blur content");
    blurButton.innerHTML = BLUR_SVG;
    heading.append(collapseButton, blurButton);
    const body = document.createElement("div");
    body.className = "md-section-body";
    body.dataset.mdSectionBody = sectionKey;
    let cursor = heading.nextSibling;
    while (cursor != null && !(cursor.nodeType === Node.ELEMENT_NODE && cursor.tagName === "H2")) {
      const next = cursor.nextSibling;
      body.appendChild(cursor);
      cursor = next;
    }
    heading.parentNode?.insertBefore(body, cursor);
    sections.push({
      key: sectionKey,
      heading,
      body,
      collapseButton,
      blurButton
    });
  });
  const getState = (section) => ({
    collapsed: boolFromStorage(keyFor(storageKey, section.key, "collapsed")),
    blurred: boolFromStorage(keyFor(storageKey, section.key, "blurred"))
  });
  const setState = (section, field, value) => {
    writeBoolToStorage(keyFor(storageKey, section.key, field), value);
  };
  const applyState = (section) => {
    const sectionState = getState(section);
    section.body.classList.toggle("is-collapsed", sectionState.collapsed);
    section.body.classList.toggle("is-blurred", sectionState.blurred);
    section.collapseButton.setAttribute("aria-label", sectionState.collapsed ? "Expand heading" : "Collapse heading");
    section.blurButton.setAttribute("aria-label", sectionState.blurred ? "Unblur content" : "Blur content");
    section.collapseButton.classList.toggle("is-expanded", !sectionState.collapsed);
    section.blurButton.classList.toggle("is-blurred", sectionState.blurred);
  };
  for (const section of sections) {
    applyState(section);
    on(section.collapseButton, "click", (event) => {
      event.stopPropagation();
      const nextCollapsed = !boolFromStorage(keyFor(storageKey, section.key, "collapsed"));
      setState(section, "collapsed", nextCollapsed);
      applyState(section);
    });
    on(section.blurButton, "click", (event) => {
      event.stopPropagation();
      const nextBlurred = !boolFromStorage(keyFor(storageKey, section.key, "blurred"));
      setState(section, "blurred", nextBlurred);
      applyState(section);
    });
  }
  const cleanup = () => {
    while (detach.length) {
      const off = detach.pop();
      off?.();
    }
    for (const section of sections) {
      if (section.collapseButton.parentNode === section.heading) {
        section.heading.removeChild(section.collapseButton);
      }
      if (section.blurButton.parentNode === section.heading) {
        section.heading.removeChild(section.blurButton);
      }
      if (section.body.parentNode) {
        const parent = section.body.parentNode;
        while (section.body.firstChild) {
          parent.insertBefore(section.body.firstChild, section.body);
        }
        parent.removeChild(section.body);
      }
      section.heading.classList.remove("md-h2");
      delete section.heading.dataset.mdSectionKey;
    }
    root.__headingSectionsCleanup = void 0;
  };
  root.__headingSectionsCleanup = cleanup;
}
function storageKeyForFile(filePath) {
  return `${STORAGE_PREFIX}:${filePath}`;
}

// deno-md-server/static/highlight-code.ts
function normalizeLanguageClass(code) {
  const cls = code.getAttribute("class") ?? "";
  const m = cls.match(/\blanguage-([^:\s]+)(:[^\s]+)?\b/);
  if (m?.[2]) {
    const next = cls.replace(/\blanguage-[^\s]+/, `language-${m[1]}`);
    code.setAttribute("class", next);
  }
}
function applySyntaxHighlight(root) {
  if (typeof hljs === "undefined" || !hljs.highlightElement) return;
  for (const node of root.querySelectorAll("pre > code")) {
    if (!(node instanceof HTMLElement)) continue;
    normalizeLanguageClass(node);
    try {
      hljs.highlightElement(node);
    } catch {
    }
  }
}

// deno-md-server/static/content-fragments.ts
var PLACEHOLDER_TEMPLATE_ID = "content-placeholder-tpl";
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var FALLBACK_PLACEHOLDER_HTML = '<div class="text-gray-400 italic placeholder-msg">Select a file from the sidebar to view its content.</div>';
function renderContentPlaceholder(container) {
  const tpl = document.getElementById(PLACEHOLDER_TEMPLATE_ID);
  if (tpl instanceof HTMLTemplateElement) {
    container.replaceChildren(tpl.content.cloneNode(true));
    return;
  }
  container.innerHTML = FALLBACK_PLACEHOLDER_HTML;
}
function renderContentLoading(container) {
  container.innerHTML = '<div class="animate-pulse text-gray-400">Loading...</div>';
}
function renderContentError(container, message) {
  container.innerHTML = `<div class="text-red-500">Error: ${escapeHtml(message)}</div>`;
}
function renderContentInvalidResponse(container) {
  container.innerHTML = '<div class="text-red-500">Error: invalid response</div>';
}
function renderContentFetchFailed(container) {
  container.innerHTML = '<div class="text-red-500">Error loading content</div>';
}

// deno-md-server/static/doc-path.ts
function setDocPathDisplay(docPathEl2, path) {
  docPathEl2.textContent = "";
  const parts = path.split("/").filter((p) => p.length > 0);
  if (parts.length === 0) {
    const fallback = document.createElement("span");
    fallback.className = "doc-path__leaf";
    fallback.textContent = path;
    docPathEl2.appendChild(fallback);
    docPathEl2.classList.remove("hidden");
    return;
  }
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) {
      docPathEl2.appendChild(document.createTextNode(" "));
      const sep = document.createElement("span");
      sep.className = "doc-path__sep";
      sep.textContent = ">";
      sep.setAttribute("aria-hidden", "true");
      docPathEl2.appendChild(sep);
      docPathEl2.appendChild(document.createTextNode(" "));
    }
    const span = document.createElement("span");
    span.className = i === parts.length - 1 ? "doc-path__leaf" : "doc-path__crumb";
    span.textContent = parts[i];
    docPathEl2.appendChild(span);
  }
  docPathEl2.classList.remove("hidden");
}
function clearDocPath(docPathEl2) {
  docPathEl2.textContent = "";
  docPathEl2.classList.add("hidden");
}

// deno-md-server/static/file-url.ts
var FILE_QUERY = "file";
function getFileFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const f = params.get(FILE_QUERY);
  return f && f.length > 0 ? f : null;
}
function setFileInUrl(file, replace) {
  const url = new URL(window.location.href);
  url.searchParams.set(FILE_QUERY, file);
  history[replace ? "replaceState" : "pushState"]({}, "", url);
}
function syncFileToUrl(file, mode) {
  if (mode === "push") setFileInUrl(file, false);
  else if (mode === "replace") setFileInUrl(file, true);
}

// deno-md-server/static/document-loader.ts
var DEFAULT_TITLE = "Markdown Viewer";
function titleForFile(path) {
  return `${path} \xB7 ${DEFAULT_TITLE}`;
}
async function loadContent(dom2, file, opts = {}) {
  const { tree: tree2, contentBody: contentBody2, docPathEl: docPathEl2 } = dom2;
  const syncUrl = opts.syncUrl ?? "push";
  tree2.setSelectedPath(file);
  tree2.render();
  document.title = titleForFile(file);
  setDocPathDisplay(docPathEl2, file);
  renderContentLoading(contentBody2);
  contentBody2.setAttribute("aria-busy", "true");
  try {
    const res = await fetch(`/api/content/${encodeURIComponent(file)}`);
    const data = await res.json();
    if ("error" in data && data.error) {
      renderContentError(contentBody2, data.error);
      syncFileToUrl(file, syncUrl);
      return;
    }
    if (!data.html || data.title === void 0) {
      renderContentInvalidResponse(contentBody2);
      return;
    }
    syncFileToUrl(file, syncUrl);
    setDocPathDisplay(docPathEl2, data.title);
    const prose = document.createElement("div");
    prose.className = "prose prose-slate max-w-none";
    prose.innerHTML = data.html;
    contentBody2.replaceChildren(prose);
    enhanceProseCodeCopy(prose);
    enhanceHeadingSections(prose, {
      storageKey: storageKeyForFile(file)
    });
    applySyntaxHighlight(prose);
    Iconify.scan(prose);
  } catch {
    renderContentFetchFailed(contentBody2);
  } finally {
    contentBody2.removeAttribute("aria-busy");
  }
}
async function selectFile(dom2, path) {
  dom2.tree.expandParentsForPath(path);
  await loadContent(dom2, path, {
    syncUrl: "push"
  });
}
async function loadInitialFileList(dom2) {
  const { tree: tree2 } = dom2;
  try {
    const res = await fetch("/api/files");
    const data = await res.json();
    if (!isStringArray(data)) {
      tree2.showListError();
      return;
    }
    const files = data;
    tree2.loadPaths(files, {
      emptyHint: files.length === 0 ? "No markdown files found." : void 0
    });
    const fromUrl = getFileFromUrl();
    if (fromUrl) {
      tree2.expandParentsForPath(fromUrl);
      tree2.setSelectedPath(fromUrl);
      tree2.render();
      await loadContent(dom2, fromUrl, {
        syncUrl: "replace"
      });
    } else {
      tree2.setSelectedPath(null);
      tree2.render();
      document.title = DEFAULT_TITLE;
    }
  } catch {
    tree2.showListError();
  }
}
function registerPopstateHandler(dom2) {
  const { tree: tree2, contentBody: contentBody2, docPathEl: docPathEl2 } = dom2;
  window.addEventListener("popstate", () => {
    const f = getFileFromUrl();
    if (f) {
      tree2.expandParentsForPath(f);
      tree2.setSelectedPath(f);
      tree2.render();
      void loadContent(dom2, f, {
        syncUrl: "none"
      });
    } else {
      tree2.setSelectedPath(null);
      tree2.render();
      clearDocPath(docPathEl2);
      renderContentPlaceholder(contentBody2);
      document.title = DEFAULT_TITLE;
    }
  });
}

// deno-md-server/static/app.ts
var fileListEl = getEl("file-list");
var contentBody = getEl("content-body");
var docPathEl = getEl("doc-path");
var fileSearchInput = getEl("file-search");
var sidebarFab = getEl("sidebar-fab");
var tree = new FileTreeView(fileListEl, (path) => {
  void selectFile({
    tree,
    contentBody,
    docPathEl
  }, path);
});
var dom = {
  tree,
  contentBody,
  docPathEl
};
attachSidebarSearch(fileSearchInput, tree);
initSidebarFab(sidebarFab);
renderContentPlaceholder(contentBody);
registerPopstateHandler(dom);
void loadInitialFileList(dom);
