// static/file-search.ts
function isErrorResponse(data) {
  return !!data && typeof data === "object" && typeof data.error === "string";
}
function isFilesListPayload(data) {
  if (!data || typeof data !== "object") return false;
  const o = data;
  if (!Array.isArray(o.paths) || !o.paths.every((x) => typeof x === "string")) {
    return false;
  }
  if (o.sort !== void 0) {
    if (typeof o.sort !== "object" || o.sort === null || Array.isArray(o.sort)) {
      return false;
    }
    for (const v of Object.values(o.sort)) {
      if (typeof v !== "number" || !Number.isFinite(v)) return false;
    }
  }
  return true;
}
async function refreshSidebarFileList(input, tree2) {
  const q = input.value.trim();
  const endpoint = q ? `/api/search?q=${encodeURIComponent(q)}` : "/api/files";
  try {
    const res = await fetch(endpoint);
    const data = await res.json();
    if (res.status === 409 && isErrorResponse(data)) {
      tree2.loadPaths([], {
        emptyHint: "Choose a folder to begin."
      });
      tree2.render();
      return;
    }
    if (!isFilesListPayload(data)) {
      tree2.showListError();
      return;
    }
    const files = data.paths;
    const sel = tree2.getSelectedPath();
    const keep = sel && files.includes(sel) ? sel : null;
    tree2.loadPaths(files, {
      preservePath: keep,
      expandAll: q.length > 0,
      emptyHint: files.length === 0 ? q ? "No files match your search." : "No markdown or HTML files found." : void 0,
      sortByPath: data.sort
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

// static/config.ts
var CONFIG = {
  favicon: "/favicon.svg",
  codeBlock: {
    /** Maximum height for code blocks (e.g., "500px", "60vh"). Set to null for no limit. */
    maxHeight: "600px"
  },
  sidebar: {
    /** Available width states for the sidebar. */
    states: [
      {
        id: "hidden",
        class: "sidebar-hidden",
        width: null
      },
      {
        id: "large",
        class: "",
        width: "w-96"
      },
      {
        id: "medium",
        class: "",
        width: "w-64"
      }
    ],
    storageKey: "deno-md-viewer-sidebar-state-v2"
  },
  /** Sidebar file list: pin-to-top and dim (cross + blur) per path. */
  fileTree: {
    pinsStorageKey: "deno-md-viewer-file-pins",
    dimmedStorageKey: "deno-md-viewer-file-dimmed"
  },
  themes: {
    storageKey: "deno-md-viewer-theme",
    defaultId: "default",
    options: [
      {
        id: "default",
        name: "Default",
        description: "Current markdown-browser baseline."
      },
      {
        id: "candy",
        name: "Pastel Candy",
        description: "Marshmallow pink, mint, butter."
      },
      {
        id: "forest",
        name: "Forest Floor",
        description: "Moss, bark, and a ribbon of copper."
      }
    ]
  },
  /** Last opened markdown roots (absolute paths), for quick switching in the sidebar. */
  recentRootsStorageKey: "deno-md-viewer-recent-roots",
  /**
   * macOS Marked 2 — `open` command (`?file=` POSIX path).
   * @see https://marked2app.com/help/URL_Handler.html
   */
  marked: {
    openBase: "x-marked://open"
  }
};

// static/components/file-tree/file-tree.ts
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
function fileSortKey(path, name, sortByPath) {
  const s = sortByPath[path];
  const primary = typeof s === "number" && Number.isFinite(s) ? s : Number.POSITIVE_INFINITY;
  return [
    primary,
    name.toLowerCase()
  ];
}
function compareFileOrder(a, b, sortByPath) {
  const [pa, na] = fileSortKey(a.path, a.name, sortByPath);
  const [pb, nb] = fileSortKey(b.path, b.name, sortByPath);
  if (pa !== pb) return pa - pb;
  return na.localeCompare(nb, void 0, {
    sensitivity: "base"
  });
}
function sortTree(node, sortByPath) {
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    if (a.type === "file" && b.type === "file") {
      return compareFileOrder(a, b, sortByPath);
    }
    return a.name.localeCompare(b.name, void 0, {
      sensitivity: "base"
    });
  });
  for (const c of node.children) {
    if (c.type === "dir") sortTree(c, sortByPath);
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
function readPathSet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return /* @__PURE__ */ new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return /* @__PURE__ */ new Set();
    return new Set(parsed.filter((x) => typeof x === "string"));
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function writePathSet(key, paths) {
  try {
    localStorage.setItem(key, JSON.stringify([
      ...paths
    ]));
  } catch {
  }
}
function readPinnedPaths() {
  try {
    const raw = localStorage.getItem(CONFIG.fileTree.pinsStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
}
function writePinnedPaths(paths) {
  try {
    localStorage.setItem(CONFIG.fileTree.pinsStorageKey, JSON.stringify(paths));
  } catch {
  }
}
function isHtmlPath(path) {
  return /\.html?$/i.test(path);
}
function reorderFilesForPins(node, sortByPath, pinned) {
  const dirs = node.children.filter((c) => c.type === "dir");
  const files = node.children.filter((c) => c.type === "file");
  const pinnedFiles = files.filter((f) => pinned.has(f.path));
  const unpinned = files.filter((f) => !pinned.has(f.path));
  pinnedFiles.sort((a, b) => compareFileOrder(a, b, sortByPath));
  unpinned.sort((a, b) => compareFileOrder(a, b, sortByPath));
  node.children = [
    ...dirs,
    ...pinnedFiles,
    ...unpinned
  ];
  for (const d of dirs) reorderFilesForPins(d, sortByPath, pinned);
}
var FileTreeView = class {
  container;
  onSelectFile;
  pinnedPanel;
  root;
  expandedFolders;
  selectedPath;
  emptyHint;
  sortByPath;
  /** Paths from the last successful `loadPaths` (for the pinned strip). */
  lastPaths;
  constructor(container, onSelectFile, pinnedPanel = null) {
    this.container = container;
    this.onSelectFile = onSelectFile;
    this.pinnedPanel = pinnedPanel;
    this.root = {
      type: "dir",
      name: "",
      children: []
    };
    this.expandedFolders = /* @__PURE__ */ new Set();
    this.selectedPath = null;
    this.emptyHint = null;
    this.sortByPath = {};
    this.lastPaths = [];
  }
  loadPaths(relativePaths, options) {
    this.lastPaths = [
      ...relativePaths
    ];
    this.root = {
      type: "dir",
      name: "",
      children: []
    };
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
  showListError() {
    this.container.innerHTML = '<div class="error-msg">Error loading files</div>';
    if (this.pinnedPanel) {
      this.pinnedPanel.replaceChildren();
      this.pinnedPanel.hidden = true;
    }
  }
  renderPinnedPanel(pinnedPaths, dimmed) {
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
      if (isHtmlPath(path)) cls += " sidebar-pinned__item--html";
      if (this.selectedPath === path) cls += " sidebar-pinned__item--active";
      if (dimmed.has(path)) cls += " sidebar-pinned__item--dimmed";
      btn.className = cls;
      btn.onclick = () => this.onSelectFile(path);
      list.appendChild(btn);
    }
    panel.append(head, list);
    Iconify.scan(panel);
  }
  renderEntry(entry, parent, parentPath, pinned, dimmed) {
    if (entry.type === "file") {
      const row2 = document.createElement("div");
      row2.className = "file-tree__file-row";
      if (dimmed.has(entry.path)) {
        row2.classList.add("file-tree__file-row--dimmed");
      }
      const pinBtn = document.createElement("button");
      pinBtn.type = "button";
      pinBtn.className = pinned.has(entry.path) ? "file-tree__icon-btn file-tree__icon-btn--active" : "file-tree__icon-btn";
      pinBtn.setAttribute("aria-label", pinned.has(entry.path) ? "Unpin file" : "Pin file to top");
      pinBtn.title = pinned.has(entry.path) ? "Unpin" : "Pin to top";
      const pinIcon = document.createElement("span");
      pinIcon.className = "iconify";
      pinIcon.setAttribute("data-icon", pinned.has(entry.path) ? "mdi:pin" : "mdi:pin-outline");
      pinIcon.setAttribute("aria-hidden", "true");
      pinBtn.appendChild(pinIcon);
      pinBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        let paths = readPinnedPaths();
        if (paths.includes(entry.path)) {
          paths = paths.filter((p) => p !== entry.path);
        } else {
          paths = [
            ...paths,
            entry.path
          ];
        }
        writePinnedPaths(paths);
        this.render();
      });
      const dimBtn = document.createElement("button");
      dimBtn.type = "button";
      dimBtn.className = dimmed.has(entry.path) ? "file-tree__icon-btn file-tree__icon-btn--active" : "file-tree__icon-btn";
      dimBtn.setAttribute("aria-label", dimmed.has(entry.path) ? "Show file normally" : "Cross and blur file");
      dimBtn.title = dimmed.has(entry.path) ? "Clear dim" : "Dim / blur";
      const dimIcon = document.createElement("span");
      dimIcon.className = "iconify";
      dimIcon.setAttribute("data-icon", dimmed.has(entry.path) ? "mdi:eye-outline" : "mdi:blur");
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
      let fileClass = "file-tree__file";
      if (isHtmlPath(entry.path)) fileClass += " file-tree__file--html";
      if (isSel) fileClass += " file-tree__file--active";
      btn.className = fileClass;
      btn.textContent = entry.name;
      btn.title = entry.path;
      btn.onclick = () => this.onSelectFile(entry.path);
      const actions = document.createElement("div");
      actions.className = "file-tree__file-actions";
      actions.append(pinBtn, dimBtn);
      row2.append(btn, actions);
      parent.appendChild(row2);
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
    label.className = "file-tree__folder-label";
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
};

// static/dom.ts
function getEl(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required element: #${id}`);
  return el;
}

// static/components/sidebar-fab/sidebar-fab.ts
function getSidebar() {
  const el = document.getElementById("sidebar");
  if (!el) throw new Error("Missing required element: #sidebar");
  return el;
}
function updateSidebarFabUi(sidebarFab2, stateId) {
  const icon = sidebarFab2.querySelector(".iconify");
  if (icon) {
    icon.setAttribute("data-icon", stateId === "hidden" ? "mdi:chevron-right" : "mdi:chevron-left");
  }
  const label = stateId === "hidden" ? "Show sidebar" : "Cycle sidebar width / Hide";
  sidebarFab2.setAttribute("aria-label", label);
  sidebarFab2.title = label;
  Iconify.scan(sidebarFab2);
}
function applySidebarState(sidebarFab2, stateId) {
  const sidebar = getSidebar();
  const state = CONFIG.sidebar.states.find((s) => s.id === stateId) || CONFIG.sidebar.states[1];
  document.body.classList.toggle("sidebar-hidden", state.id === "hidden");
  for (const s of CONFIG.sidebar.states) {
    if (s.width) sidebar.classList.remove(s.width);
  }
  if (state.width) sidebar.classList.add(state.width);
  try {
    localStorage.setItem(CONFIG.sidebar.storageKey, state.id);
  } catch {
  }
  updateSidebarFabUi(sidebarFab2, state.id);
}
function initSidebarFab(sidebarFab2) {
  let stateId = "medium";
  try {
    const saved = localStorage.getItem(CONFIG.sidebar.storageKey);
    if (saved && CONFIG.sidebar.states.some((s) => s.id === saved)) {
      stateId = saved;
    }
  } catch {
  }
  applySidebarState(sidebarFab2, stateId);
  sidebarFab2.addEventListener("click", () => {
    const saved = localStorage.getItem(CONFIG.sidebar.storageKey) || "medium";
    const currentIndex = CONFIG.sidebar.states.findIndex((s) => s.id === saved);
    const nextIndex = (currentIndex + 1) % CONFIG.sidebar.states.length;
    const nextState = CONFIG.sidebar.states[nextIndex];
    applySidebarState(sidebarFab2, nextState.id);
  });
}

// static/components/next-h2-fab/next-h2-fab.ts
function initNextH2Fab(fab) {
  fab.addEventListener("click", () => {
    const contentBody2 = getEl("content-body");
    const headings = Array.from(contentBody2.querySelectorAll("h2"));
    if (headings.length === 0) return;
    const viewportTop = window.scrollY || document.documentElement.scrollTop;
    const nextHeading = headings.find((h) => {
      const rect = h.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;
      return absoluteTop > viewportTop + 10;
    });
    if (nextHeading) {
      nextHeading.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    } else {
      headings[0].scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
  if (typeof Iconify !== "undefined") {
    Iconify.scan(fab);
  }
}

// static/components/settings/settings-fab.ts
function isThemeId(value) {
  return CONFIG.themes.options.some((theme) => theme.id === value);
}
function readThemeId() {
  try {
    const saved = localStorage.getItem(CONFIG.themes.storageKey);
    if (isThemeId(saved)) return saved;
  } catch {
  }
  return CONFIG.themes.defaultId;
}
function writeThemeId(themeId) {
  try {
    localStorage.setItem(CONFIG.themes.storageKey, themeId);
  } catch {
  }
}
function applyTheme(themeId) {
  document.documentElement.dataset.theme = themeId;
}
function setPanelOpen(fab, panel, isOpen) {
  panel.hidden = !isOpen;
  fab.setAttribute("aria-expanded", isOpen ? "true" : "false");
  fab.title = isOpen ? "Close settings" : "Open settings";
}
function renderThemeOptions(panel, selectedThemeId) {
  const list = panel.querySelector("[data-settings-theme-list]");
  if (!list) return;
  list.replaceChildren();
  for (const theme of CONFIG.themes.options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "settings-panel__theme";
    button.dataset.themeOption = theme.id;
    button.setAttribute("aria-pressed", theme.id === selectedThemeId ? "true" : "false");
    const swatch = document.createElement("span");
    swatch.className = `settings-panel__theme-swatch settings-panel__theme-swatch--${theme.id}`;
    swatch.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.className = "settings-panel__theme-text";
    const name = document.createElement("span");
    name.className = "settings-panel__theme-name";
    name.textContent = theme.name;
    const description = document.createElement("span");
    description.className = "settings-panel__theme-description";
    description.textContent = theme.description;
    text.append(name, description);
    button.append(swatch, text);
    list.appendChild(button);
  }
}
function updateSelectedTheme(panel, selectedThemeId) {
  const buttons = panel.querySelectorAll("[data-theme-option]");
  for (const button of buttons) {
    button.setAttribute("aria-pressed", button.dataset.themeOption === selectedThemeId ? "true" : "false");
  }
}
function initSettingsFab(fab, panel) {
  let selectedThemeId = readThemeId();
  applyTheme(selectedThemeId);
  renderThemeOptions(panel, selectedThemeId);
  setPanelOpen(fab, panel, false);
  fab.addEventListener("click", (event) => {
    event.stopPropagation();
    setPanelOpen(fab, panel, panel.hidden);
  });
  panel.addEventListener("click", (event) => {
    event.stopPropagation();
    const option = event.target?.closest("[data-theme-option]");
    const nextThemeId = option?.dataset.themeOption ?? null;
    if (!isThemeId(nextThemeId)) return;
    selectedThemeId = nextThemeId;
    applyTheme(selectedThemeId);
    writeThemeId(selectedThemeId);
    updateSelectedTheme(panel, selectedThemeId);
  });
  document.addEventListener("click", () => {
    if (!panel.hidden) setPanelOpen(fab, panel, false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || panel.hidden) return;
    setPanelOpen(fab, panel, false);
    fab.focus();
  });
  if (typeof Iconify !== "undefined") {
    Iconify.scan(fab);
  }
}

// static/components/code-copy/code-copy.ts
var COPY_ICON = "mdi:content-copy";
var CHECK_ICON = "mdi:check";
var RUN_TRIGGER_URL = "kmtrigger://macro=web_2_terminal";
function triggerRunMacro() {
  const launcher = document.createElement("iframe");
  launcher.style.display = "none";
  launcher.src = RUN_TRIGGER_URL;
  document.body.appendChild(launcher);
  window.setTimeout(() => {
    launcher.remove();
  }, 800);
}
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
function normalizeBlockClipboardText(text) {
  return text.replace(/(?:\r\n|\r|\n)+$/, "");
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
    runBtn.setAttribute("aria-label", "Run code");
    runBtn.title = "Run";
    const runLabel = document.createElement("span");
    runLabel.className = "code-block-action__text";
    runLabel.textContent = "Run";
    runBtn.append(makeIconSpan("mdi:play"), runLabel);
    let runResetTimer = null;
    runBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const c = pre.querySelector("code");
      const text = normalizeBlockClipboardText(c?.textContent ?? pre.textContent ?? "");
      void navigator.clipboard.writeText(text).catch(() => {
      }).finally(() => {
        triggerRunMacro();
      });
      runLabel.textContent = "Ran";
      runBtn.classList.add("is-ran");
      if (runResetTimer) clearTimeout(runResetTimer);
      runResetTimer = setTimeout(() => {
        runLabel.textContent = "Run";
        runBtn.classList.remove("is-ran");
      }, 1400);
    });
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
      const text = normalizeBlockClipboardText(c?.textContent ?? pre.textContent ?? "");
      void copyText(text, copyBtn, "block");
    });
    actions.append(runBtn, copyBtn);
    toolbar.append(meta, actions);
    pre.parentNode?.insertBefore(wrap, pre);
    wrap.append(toolbar, pre);
    if (CONFIG.codeBlock.maxHeight) {
      pre.style.maxHeight = CONFIG.codeBlock.maxHeight;
      pre.style.overflowY = "auto";
    }
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

// static/heading-sections.ts
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

// static/highlight-code.ts
function normalizeLanguageClass(code) {
  const cls = code.getAttribute("class") ?? "";
  const m = cls.match(/\blanguage-([^:\s]+)(:[^\s]+)?\b/);
  if (m?.[2]) {
    const next = cls.replace(/\blanguage-[^\s]+/, `language-${m[1]}`);
    code.setAttribute("class", next);
  }
}
function applySyntaxHighlight(root) {
  if (typeof Prism === "undefined" || !Prism.highlightElement) return;
  for (const node of root.querySelectorAll("pre > code")) {
    if (!(node instanceof HTMLElement)) continue;
    normalizeLanguageClass(node);
    try {
      Prism.highlightElement(node);
    } catch {
    }
  }
}

// static/content-fragments.ts
var PLACEHOLDER_TEMPLATE_ID = "content-placeholder-tpl";
var CHOOSE_ROOT_TEMPLATE_ID = "content-choose-root-tpl";
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var FALLBACK_PLACEHOLDER_HTML = '<div class="placeholder-msg">Select a file from the sidebar to view its content.</div>';
function renderContentPlaceholder(container) {
  const tpl = document.getElementById(PLACEHOLDER_TEMPLATE_ID);
  if (tpl instanceof HTMLTemplateElement) {
    container.replaceChildren(tpl.content.cloneNode(true));
    return;
  }
  container.innerHTML = FALLBACK_PLACEHOLDER_HTML;
}
function renderChooseRootPlaceholder(container) {
  const tpl = document.getElementById(CHOOSE_ROOT_TEMPLATE_ID);
  if (tpl instanceof HTMLTemplateElement) {
    container.replaceChildren(tpl.content.cloneNode(true));
    return;
  }
  container.innerHTML = '<div class="placeholder-msg">Choose a folder to begin.</div>';
}
function renderContentLoading(container) {
  container.innerHTML = '<div class="loading-msg">Loading...</div>';
}
function renderContentError(container, message) {
  container.innerHTML = `<div class="error-msg">Error: ${escapeHtml(message)}</div>`;
}
function renderContentInvalidResponse(container) {
  container.innerHTML = '<div class="error-msg">Error: invalid response</div>';
}
function renderContentFetchFailed(container) {
  container.innerHTML = '<div class="error-msg">Error loading content</div>';
}

// static/doc-path.ts
var CURSOR_NEW_WINDOW_QUERY = "?windowId=_blank";
function hrefOpenInCursor(absolutePath, options) {
  const normalized = absolutePath.replace(/\\/g, "/");
  let url = `cursor://file${encodeURI(normalized)}`;
  if (options?.newWindow) {
    url += CURSOR_NEW_WINDOW_QUERY;
  }
  return url;
}
function hrefOpenInMarked(absolutePath) {
  const normalized = absolutePath.replace(/\\/g, "/");
  return `${CONFIG.marked.openBase}?file=${encodeURIComponent(normalized)}`;
}
function appendOpenInCursorButton(docPathEl2, absolutePath) {
  const a = document.createElement("a");
  a.className = "doc-path__cursor-btn";
  a.href = hrefOpenInCursor(absolutePath, {
    newWindow: true
  });
  a.setAttribute("aria-label", "Open project and file in Cursor");
  a.title = "Open project and file in Cursor";
  a.rel = "noopener noreferrer";
  a.addEventListener("click", async (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    try {
      const res = await fetch("/api/open-in-cursor", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          absolutePath
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
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
  docPathEl2.appendChild(a);
  Iconify.scan(a);
}
function appendParentFolderPlaceholderButton(docPathEl2) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "doc-path__parent-folder-btn doc-path__parent-folder-btn--placeholder";
  btn.disabled = true;
  btn.setAttribute("aria-label", "Open parent folder \u2014 not available yet");
  btn.title = "Open parent folder \u2014 not available yet";
  const icon = document.createElement("span");
  icon.className = "iconify";
  icon.setAttribute("data-icon", "mdi:folder-outline");
  icon.setAttribute("aria-hidden", "true");
  btn.appendChild(icon);
  docPathEl2.appendChild(btn);
  Iconify.scan(btn);
}
function appendOpenInMarkedButton(docPathEl2, absolutePath) {
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
  docPathEl2.appendChild(a);
  Iconify.scan(a);
}
function appendDocPathAppButtons(docPathEl2, absolutePath) {
  appendOpenInCursorButton(docPathEl2, absolutePath);
  appendParentFolderPlaceholderButton(docPathEl2);
  appendOpenInMarkedButton(docPathEl2, absolutePath);
}
function setDocPathDisplay(docPathEl2, path, options) {
  docPathEl2.replaceChildren();
  const absolutePath = options?.absolutePath;
  const parts = path.split("/").filter((p) => p.length > 0);
  if (parts.length === 0) {
    const fallback = document.createElement("span");
    fallback.className = "doc-path__leaf";
    fallback.textContent = path;
    docPathEl2.appendChild(fallback);
    if (absolutePath) {
      appendDocPathAppButtons(docPathEl2, absolutePath);
    }
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
    const isLeaf = i === parts.length - 1;
    if (isLeaf && absolutePath) {
      appendDocPathAppButtons(docPathEl2, absolutePath);
    }
  }
  docPathEl2.classList.remove("hidden");
}
function clearDocPath(docPathEl2) {
  docPathEl2.textContent = "";
  docPathEl2.classList.add("hidden");
}

// static/frontmatter-meta.ts
function normalizeTags(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((t) => typeof t === "string" && t.trim() !== "");
}
function formatDate(v) {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}
function buildFrontmatterMetaEl(fm, options) {
  if (!fm) return null;
  const title = options?.showTitle && typeof fm.title === "string" && fm.title.trim() !== "" ? fm.title.trim() : null;
  const category = typeof fm.category === "string" && fm.category.trim() !== "" ? fm.category.trim() : null;
  const description = typeof fm.description === "string" && fm.description.trim() !== "" ? fm.description.trim() : null;
  const dateStr = formatDate(fm.date);
  const tags = normalizeTags(fm.tags);
  if (!title && !category && !description && !dateStr && tags.length === 0) {
    return null;
  }
  const root = document.createElement("div");
  root.className = "doc-meta";
  if (title) {
    const h = document.createElement("h1");
    h.className = "doc-meta__title";
    h.textContent = title;
    root.appendChild(h);
  }
  if (category) {
    const row = document.createElement("div");
    row.className = "doc-meta__row doc-meta__row--baseline";
    const lab = document.createElement("span");
    lab.className = "doc-meta__label";
    lab.textContent = "Category";
    const val = document.createElement("span");
    val.className = "doc-meta__value";
    val.textContent = category;
    row.appendChild(lab);
    row.appendChild(val);
    root.appendChild(row);
  }
  if (description) {
    const p = document.createElement("p");
    p.className = "doc-meta__description";
    p.textContent = description;
    root.appendChild(p);
  }
  if (dateStr) {
    const row = document.createElement("div");
    row.className = "doc-meta__row doc-meta__row--center";
    const icon = document.createElement("span");
    icon.className = "iconify doc-meta__icon";
    icon.setAttribute("data-icon", "mdi:calendar-outline");
    icon.setAttribute("aria-hidden", "true");
    const lab = document.createElement("span");
    lab.className = "sr-only";
    lab.textContent = "Date";
    const val = document.createElement("time");
    val.dateTime = dateStr;
    val.textContent = dateStr;
    row.appendChild(icon);
    row.appendChild(lab);
    row.appendChild(val);
    root.appendChild(row);
  }
  if (tags.length > 0) {
    const block = document.createElement("div");
    block.className = "doc-meta__block";
    const lab = document.createElement("div");
    lab.className = "doc-meta__label";
    lab.textContent = "Tags";
    const chips = document.createElement("div");
    chips.className = "doc-meta__chips";
    for (const t of tags) {
      const chip = document.createElement("span");
      chip.className = "doc-meta__chip";
      chip.textContent = t;
      chips.appendChild(chip);
    }
    block.appendChild(lab);
    block.appendChild(chips);
    root.appendChild(block);
  }
  return root;
}

// static/file-url.ts
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
function clearFileFromUrl(replace = true) {
  const url = new URL(window.location.href);
  url.searchParams.delete(FILE_QUERY);
  history[replace ? "replaceState" : "pushState"]({}, "", url);
}
function syncFileToUrl(file, mode) {
  if (mode === "push") setFileInUrl(file, false);
  else if (mode === "replace") setFileInUrl(file, true);
}

// static/document-loader.ts
var DEFAULT_TITLE = "Markdown Viewer";
function pageTitleFromFrontmatter(frontmatter) {
  const t = frontmatter?.title;
  return typeof t === "string" && t.trim() !== "" ? t : null;
}
function isErrorResponse2(data) {
  return !!data && typeof data === "object" && typeof data.error === "string";
}
function titleForFile(path) {
  return `${path} \xB7 ${DEFAULT_TITLE}`;
}
function isHtmlPath2(path) {
  return /\.html?$/i.test(path);
}
function showMarkdownShell(dom2) {
  dom2.appMain.classList.remove("app-main--html");
  if (dom2.contentShell.parentElement !== dom2.appMain) {
    dom2.appMain.replaceChildren(dom2.contentShell);
  }
}
function showHtmlMessage(dom2, message, className) {
  const el = document.createElement("div");
  el.className = className;
  el.textContent = message;
  dom2.appMain.classList.add("app-main--html");
  dom2.appMain.replaceChildren(el);
}
function showHtmlDocument(dom2, html) {
  const frame = document.createElement("iframe");
  frame.className = "html-document-frame";
  frame.title = "HTML preview";
  frame.sandbox.add("allow-same-origin", "allow-scripts", "allow-forms", "allow-popups");
  frame.srcdoc = html;
  dom2.appMain.classList.add("app-main--html");
  dom2.appMain.replaceChildren(frame);
}
async function loadContent(dom2, file, opts = {}) {
  const { tree: tree2, contentBody: contentBody2, docPathEl: docPathEl2 } = dom2;
  const syncUrl = opts.syncUrl ?? "push";
  tree2.setSelectedPath(file);
  tree2.render();
  document.title = titleForFile(file);
  const htmlFile = isHtmlPath2(file);
  if (htmlFile) {
    clearDocPath(docPathEl2);
    showHtmlMessage(dom2, "Loading...", "loading-msg");
  } else {
    showMarkdownShell(dom2);
    setDocPathDisplay(docPathEl2, file);
    renderContentLoading(contentBody2);
    contentBody2.setAttribute("aria-busy", "true");
  }
  try {
    const res = await fetch(`/api/content/${encodeURIComponent(file)}`);
    const data = await res.json();
    if ("error" in data && data.error) {
      if (htmlFile) {
        showHtmlMessage(dom2, `Error: ${data.error}`, "error-msg");
        syncFileToUrl(file, syncUrl);
        return;
      }
      renderContentError(contentBody2, data.error);
      syncFileToUrl(file, syncUrl);
      return;
    }
    if (!data.html || data.title === void 0) {
      if (htmlFile) {
        showHtmlMessage(dom2, "Error: invalid response", "error-msg");
        return;
      }
      renderContentInvalidResponse(contentBody2);
      return;
    }
    syncFileToUrl(file, syncUrl);
    if (data.kind === "html") {
      document.title = titleForFile(data.title);
      clearDocPath(docPathEl2);
      showHtmlDocument(dom2, data.html);
      return;
    }
    showMarkdownShell(dom2);
    const fmTitle = pageTitleFromFrontmatter(data.frontmatter);
    document.title = fmTitle ? `${fmTitle} \xB7 ${DEFAULT_TITLE}` : titleForFile(file);
    setDocPathDisplay(docPathEl2, data.title, {
      absolutePath: data.absolutePath
    });
    const prose = document.createElement("div");
    prose.className = "prose";
    prose.innerHTML = data.html;
    const hasDocumentH1 = prose.querySelector("h1") !== null;
    contentBody2.replaceChildren();
    const resolvedMetaEl = buildFrontmatterMetaEl(data.frontmatter, {
      showTitle: !hasDocumentH1
    });
    if (resolvedMetaEl) contentBody2.appendChild(resolvedMetaEl);
    contentBody2.appendChild(prose);
    enhanceProseCodeCopy(prose);
    enhanceHeadingSections(prose, {
      storageKey: storageKeyForFile(file)
    });
    applySyntaxHighlight(prose);
    Iconify.scan(contentBody2);
  } catch {
    if (htmlFile) {
      showHtmlMessage(dom2, "Error loading content", "error-msg");
      return;
    }
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
  const { tree: tree2, contentBody: contentBody2, docPathEl: docPathEl2 } = dom2;
  try {
    const res = await fetch("/api/files");
    const data = await res.json();
    if (res.status === 409 && isErrorResponse2(data)) {
      showMarkdownShell(dom2);
      tree2.loadPaths([], {
        emptyHint: "Choose a folder to begin."
      });
      tree2.render();
      clearDocPath(docPathEl2);
      renderChooseRootPlaceholder(contentBody2);
      document.title = DEFAULT_TITLE;
      return;
    }
    if (!isFilesListPayload(data)) {
      tree2.showListError();
      return;
    }
    const files = data.paths;
    tree2.loadPaths(files, {
      emptyHint: files.length === 0 ? "No markdown or HTML files found." : void 0,
      sortByPath: data.sort
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
      showMarkdownShell(dom2);
      tree2.setSelectedPath(null);
      tree2.render();
      clearDocPath(docPathEl2);
      renderContentPlaceholder(contentBody2);
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
      showMarkdownShell(dom2);
      tree2.setSelectedPath(null);
      tree2.render();
      clearDocPath(docPathEl2);
      renderContentPlaceholder(contentBody2);
      document.title = DEFAULT_TITLE;
    }
  });
}

// static/root-picker.ts
var MAX_RECENT_ROOTS = 5;
function getRootPickerEl(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing root picker element: #${id}`);
  return el;
}
function setInlineError(message) {
  const errorEl = getRootPickerEl("root-picker-error");
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  } else {
    errorEl.textContent = "";
    errorEl.hidden = true;
  }
}
function getRecentRoots() {
  try {
    const raw = localStorage.getItem(CONFIG.recentRootsStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => typeof p === "string");
  } catch {
    return [];
  }
}
function pushRecentRoot(path) {
  const list = getRecentRoots().filter((p) => p !== path);
  list.unshift(path);
  localStorage.setItem(CONFIG.recentRootsStorageKey, JSON.stringify(list.slice(0, MAX_RECENT_ROOTS)));
}
function folderBasename(absolutePath) {
  const trimmed = absolutePath.replace(/\/+$/, "");
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length === 0) return absolutePath === "/" ? "/" : absolutePath;
  return parts[parts.length - 1];
}
function renderRecentFolders(currentRoot, listEl, onPick) {
  const recent = getRecentRoots().filter((p) => p !== currentRoot).slice(0, MAX_RECENT_ROOTS);
  listEl.replaceChildren();
  if (recent.length === 0) {
    listEl.hidden = true;
    return;
  }
  listEl.hidden = false;
  for (const path of recent) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "root-picker__recent-item";
    btn.title = path;
    const nameEl = document.createElement("span");
    nameEl.className = "root-picker__recent-name";
    nameEl.textContent = folderBasename(path);
    const pathEl = document.createElement("span");
    pathEl.className = "root-picker__recent-path";
    pathEl.textContent = path;
    btn.append(nameEl, pathEl);
    btn.addEventListener("click", () => onPick(path));
    li.appendChild(btn);
    listEl.appendChild(li);
  }
}
function setCurrentRootLabel(root, filesHeading) {
  const label = getRootPickerEl("root-current-path");
  const nameEl = getRootPickerEl("root-current-path-name");
  const fullEl = getRootPickerEl("root-current-path-full");
  const rootPicker = getRootPickerEl("root-picker");
  if (root) {
    nameEl.textContent = folderBasename(root);
    fullEl.textContent = root;
    fullEl.hidden = false;
    label.title = root;
    rootPicker.classList.remove("root-picker--empty");
    filesHeading.textContent = folderBasename(root);
  } else {
    nameEl.textContent = "No folder selected";
    fullEl.textContent = "";
    fullEl.hidden = true;
    label.removeAttribute("title");
    rootPicker.classList.add("root-picker--empty");
    filesHeading.textContent = "Files";
  }
}
function toggleManualEntry(show) {
  const panel = getRootPickerEl("root-manual-panel");
  const toggle = getRootPickerEl("root-manual-toggle");
  panel.hidden = !show;
  toggle.setAttribute("aria-expanded", show ? "true" : "false");
}
function toggleSidebarBrowsing(hasRoot) {
  const fileSearch = getRootPickerEl("file-search");
  const fileList = getRootPickerEl("file-list");
  const pinnedFiles = getRootPickerEl("pinned-files");
  fileSearch.disabled = !hasRoot;
  fileSearch.placeholder = hasRoot ? "Search name or content\u2026" : "Choose a folder first";
  fileList.hidden = !hasRoot;
  pinnedFiles.hidden = true;
}
async function parseRootResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    return {
      error: typeof data.error === "string" ? data.error : "Request failed"
    };
  }
  if ("root" in data && (typeof data.root === "string" || data.root === null)) {
    return {
      root: data.root
    };
  }
  if (typeof data.error === "string") return {
    error: data.error
  };
  return {
    error: "Invalid root response"
  };
}
async function requestRootChange(endpoint, body) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: body ? {
      "content-type": "application/json"
    } : void 0,
    body: body ? JSON.stringify(body) : void 0
  });
  const data = await parseRootResponse(res);
  if ("error" in data) throw new Error(data.error);
  if (typeof data.root !== "string" || data.root.length === 0) {
    throw new Error("Invalid root response");
  }
  return data.root;
}
async function initRootPicker(onRootChanged) {
  const changeButton = getRootPickerEl("root-change-btn");
  const manualToggle = getRootPickerEl("root-manual-toggle");
  const manualPanel = getRootPickerEl("root-manual-panel");
  const manualInput = getRootPickerEl("root-manual-input");
  const manualSubmit = getRootPickerEl("root-manual-submit");
  const manualCancel = getRootPickerEl("root-manual-cancel");
  const rootPicker = getRootPickerEl("root-picker");
  const recentListEl = getRootPickerEl("root-recent-folders");
  const filesHeading = getRootPickerEl("sidebar-files-heading");
  let currentRoot = null;
  let rootPickerExpanded = false;
  function syncRootPickerVisibility() {
    if (currentRoot === null) {
      rootPicker.hidden = false;
      filesHeading.removeAttribute("aria-expanded");
      filesHeading.removeAttribute("aria-controls");
      filesHeading.removeAttribute("aria-label");
      filesHeading.removeAttribute("tabindex");
      filesHeading.removeAttribute("role");
      filesHeading.removeAttribute("title");
      filesHeading.classList.remove("cursor-pointer");
    } else {
      rootPicker.hidden = !rootPickerExpanded;
      const base = folderBasename(currentRoot);
      filesHeading.setAttribute("aria-expanded", rootPickerExpanded ? "true" : "false");
      filesHeading.setAttribute("aria-controls", "root-picker");
      filesHeading.setAttribute("aria-label", `${base} \u2014 ${rootPickerExpanded ? "Hide" : "Show"} folder selection`);
      filesHeading.setAttribute("tabindex", "0");
      filesHeading.setAttribute("role", "button");
      filesHeading.title = rootPickerExpanded ? "Hide folder selection" : "Show folder selection";
      filesHeading.classList.add("cursor-pointer");
    }
  }
  function refreshRecentList() {
    renderRecentFolders(currentRoot, recentListEl, (path) => {
      void openRecentPath(path);
    });
  }
  async function openRecentPath(path) {
    setPending(true);
    setInlineError(null);
    try {
      await applyRoot(await requestRootChange("/api/root", {
        path
      }));
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(false);
    }
  }
  async function applyRoot(root) {
    currentRoot = root;
    pushRecentRoot(root);
    setCurrentRootLabel(root, filesHeading);
    toggleSidebarBrowsing(true);
    setInlineError(null);
    toggleManualEntry(false);
    manualInput.value = root;
    rootPickerExpanded = false;
    syncRootPickerVisibility();
    refreshRecentList();
    await onRootChanged(root);
  }
  function setPending(pending) {
    changeButton.disabled = pending;
    manualToggle.toggleAttribute("disabled", pending);
    manualSubmit.disabled = pending;
    manualCancel.disabled = pending;
    manualInput.disabled = pending;
    for (const btn of recentListEl.querySelectorAll(".root-picker__recent-item")) {
      btn.disabled = pending;
    }
  }
  function onFilesHeadingActivate() {
    if (currentRoot === null) return;
    rootPickerExpanded = !rootPickerExpanded;
    syncRootPickerVisibility();
  }
  filesHeading.addEventListener("click", (e) => {
    e.preventDefault();
    onFilesHeadingActivate();
  });
  filesHeading.addEventListener("keydown", (e) => {
    if (currentRoot === null) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onFilesHeadingActivate();
    }
  });
  changeButton.addEventListener("click", () => {
    void (async () => {
      setPending(true);
      setInlineError(null);
      try {
        await applyRoot(await requestRootChange("/api/pick-root"));
      } catch (error) {
        setInlineError(error instanceof Error ? error.message : String(error));
      } finally {
        setPending(false);
      }
    })();
  });
  manualToggle.addEventListener("click", () => {
    const shouldShow = manualPanel.hidden;
    toggleManualEntry(shouldShow);
    if (shouldShow) {
      manualInput.focus();
      manualInput.select();
    }
  });
  manualCancel.addEventListener("click", () => {
    toggleManualEntry(false);
    manualInput.value = currentRoot ?? "";
    setInlineError(null);
  });
  manualSubmit.addEventListener("click", () => {
    void (async () => {
      const path = manualInput.value.trim();
      if (!path) {
        setInlineError("Enter a folder path.");
        return;
      }
      setPending(true);
      setInlineError(null);
      try {
        await applyRoot(await requestRootChange("/api/root", {
          path
        }));
      } catch (error) {
        setInlineError(error instanceof Error ? error.message : String(error));
      } finally {
        setPending(false);
      }
    })();
  });
  manualInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      manualSubmit.click();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      manualCancel.click();
    }
  });
  try {
    const res = await fetch("/api/root");
    const data = await parseRootResponse(res);
    if ("error" in data) {
      setInlineError(data.error ?? "Could not load saved root.");
      setCurrentRootLabel(null, filesHeading);
      toggleSidebarBrowsing(false);
      syncRootPickerVisibility();
      refreshRecentList();
      return null;
    }
    currentRoot = data.root;
    setCurrentRootLabel(currentRoot, filesHeading);
    toggleSidebarBrowsing(currentRoot !== null);
    if (currentRoot !== null) {
      manualInput.value = currentRoot;
      pushRecentRoot(currentRoot);
      rootPickerExpanded = false;
      syncRootPickerVisibility();
    } else {
      syncRootPickerVisibility();
    }
    refreshRecentList();
    return currentRoot;
  } catch {
    setInlineError("Could not load saved root.");
    setCurrentRootLabel(null, filesHeading);
    toggleSidebarBrowsing(false);
    syncRootPickerVisibility();
    refreshRecentList();
    return null;
  }
}

// static/app.ts
function updateFavicon() {
  const link = document.querySelector("link[rel*='icon']") || document.createElement("link");
  link.type = "image/svg+xml";
  link.rel = "icon";
  link.href = CONFIG.favicon;
  document.getElementsByTagName("head")[0].appendChild(link);
}
var fileListEl = getEl("file-list");
var pinnedFilesEl = getEl("pinned-files");
var appMain = document.querySelector(".app-main");
if (!appMain) throw new Error("Missing required element: .app-main");
var contentShell = getEl("content");
var contentBody = getEl("content-body");
var docPathEl = getEl("doc-path");
var fileSearchInput = getEl("file-search");
var sidebarFab = getEl("sidebar-fab");
var nextH2Fab = getEl("next-h2-fab");
var settingsFab = getEl("settings-fab");
var settingsPanel = getEl("settings-panel");
var tree = new FileTreeView(fileListEl, (path) => {
  void selectFile({
    tree,
    appMain,
    contentShell,
    contentBody,
    docPathEl
  }, path);
}, pinnedFilesEl);
var dom = {
  tree,
  appMain,
  contentShell,
  contentBody,
  docPathEl
};
attachSidebarSearch(fileSearchInput, tree);
initSidebarFab(sidebarFab);
initNextH2Fab(nextH2Fab);
initSettingsFab(settingsFab, settingsPanel);
updateFavicon();
renderContentPlaceholder(contentBody);
registerPopstateHandler(dom);
async function handleRootChanged() {
  fileSearchInput.value = "";
  clearFileFromUrl();
  tree.loadPaths([]);
  tree.render();
  clearDocPath(docPathEl);
  renderContentPlaceholder(contentBody);
  await loadInitialFileList(dom);
}
void (async () => {
  const initialRoot = await initRootPicker(handleRootChanged);
  if (initialRoot === null) {
    clearDocPath(docPathEl);
    renderChooseRootPlaceholder(contentBody);
    return;
  }
  await loadInitialFileList(dom);
})();
