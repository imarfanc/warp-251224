import { CONFIG } from "./config.ts";

type RootResponse =
  | { root: string | null; error?: undefined }
  | { root?: undefined; error: string };

const MAX_RECENT_ROOTS = 5;

function getRootPickerEl(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing root picker element: #${id}`);
  return el;
}

function setInlineError(message: string | null): void {
  const errorEl = getRootPickerEl("root-picker-error");
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  } else {
    errorEl.textContent = "";
    errorEl.hidden = true;
  }
}

function getRecentRoots(): string[] {
  try {
    const raw = localStorage.getItem(CONFIG.recentRootsStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is string => typeof p === "string");
  } catch {
    return [];
  }
}

function pushRecentRoot(path: string): void {
  const list = getRecentRoots().filter((p) => p !== path);
  list.unshift(path);
  localStorage.setItem(
    CONFIG.recentRootsStorageKey,
    JSON.stringify(list.slice(0, MAX_RECENT_ROOTS)),
  );
}

/** Last path segment for display (POSIX-style absolute paths). */
function folderBasename(absolutePath: string): string {
  const trimmed = absolutePath.replace(/\/+$/, "");
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length === 0) return absolutePath === "/" ? "/" : absolutePath;
  return parts[parts.length - 1]!;
}

function renderRecentFolders(
  currentRoot: string | null,
  listEl: HTMLElement,
  onPick: (path: string) => void,
): void {
  const recent = getRecentRoots()
    .filter((p) => p !== currentRoot)
    .slice(0, MAX_RECENT_ROOTS);
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

function setCurrentRootLabel(
  root: string | null,
  filesHeading: HTMLElement,
): void {
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

function toggleManualEntry(show: boolean): void {
  const panel = getRootPickerEl("root-manual-panel");
  const toggle = getRootPickerEl("root-manual-toggle");
  panel.hidden = !show;
  toggle.setAttribute("aria-expanded", show ? "true" : "false");
}

function toggleSidebarBrowsing(hasRoot: boolean): void {
  const fileSearch = getRootPickerEl("file-search") as HTMLInputElement;
  const fileList = getRootPickerEl("file-list");
  const pinnedFiles = getRootPickerEl("pinned-files");

  fileSearch.disabled = !hasRoot;
  fileSearch.placeholder = hasRoot
    ? "Search name or content…"
    : "Choose a folder first";
  fileList.hidden = !hasRoot;
  pinnedFiles.hidden = true;
}

async function parseRootResponse(res: Response): Promise<RootResponse> {
  const data = await res.json() as Partial<RootResponse>;
  if (!res.ok) {
    return {
      error: typeof data.error === "string" ? data.error : "Request failed",
    };
  }
  if ("root" in data && (typeof data.root === "string" || data.root === null)) {
    return { root: data.root };
  }
  if (typeof data.error === "string") return { error: data.error };
  return { error: "Invalid root response" };
}

async function requestRootChange(
  endpoint: string,
  body?: { path: string },
): Promise<string> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await parseRootResponse(res);
  if ("error" in data) throw new Error(data.error);
  if (typeof data.root !== "string" || data.root.length === 0) {
    throw new Error("Invalid root response");
  }
  return data.root;
}

export async function initRootPicker(
  onRootChanged: (root: string) => Promise<void> | void,
): Promise<string | null> {
  const changeButton = getRootPickerEl("root-change-btn") as HTMLButtonElement;
  const manualToggle = getRootPickerEl(
    "root-manual-toggle",
  ) as HTMLButtonElement;
  const manualPanel = getRootPickerEl("root-manual-panel");
  const manualInput = getRootPickerEl("root-manual-input") as HTMLInputElement;
  const manualSubmit = getRootPickerEl(
    "root-manual-submit",
  ) as HTMLButtonElement;
  const manualCancel = getRootPickerEl(
    "root-manual-cancel",
  ) as HTMLButtonElement;
  const rootPicker = getRootPickerEl("root-picker");
  const recentListEl = getRootPickerEl("root-recent-folders");
  const filesHeading = getRootPickerEl("sidebar-files-heading");

  let currentRoot: string | null = null;
  /** When a folder is selected, the picker is hidden until the user opens it via the Files heading. */
  let rootPickerExpanded = false;

  function syncRootPickerVisibility(): void {
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
      filesHeading.setAttribute(
        "aria-label",
        `${base} — ${rootPickerExpanded ? "Hide" : "Show"} folder selection`,
      );
      filesHeading.setAttribute("tabindex", "0");
      filesHeading.setAttribute("role", "button");
      filesHeading.title = rootPickerExpanded
        ? "Hide folder selection"
        : "Show folder selection";
      filesHeading.classList.add("cursor-pointer");
    }
  }

  function refreshRecentList(): void {
    renderRecentFolders(currentRoot, recentListEl, (path) => {
      void openRecentPath(path);
    });
  }

  async function openRecentPath(path: string): Promise<void> {
    setPending(true);
    setInlineError(null);
    try {
      await applyRoot(await requestRootChange("/api/root", { path }));
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(false);
    }
  }

  async function applyRoot(root: string): Promise<void> {
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

  function setPending(pending: boolean): void {
    changeButton.disabled = pending;
    manualToggle.toggleAttribute("disabled", pending);
    manualSubmit.disabled = pending;
    manualCancel.disabled = pending;
    manualInput.disabled = pending;
    for (
      const btn of recentListEl.querySelectorAll<HTMLButtonElement>(
        ".root-picker__recent-item",
      )
    ) {
      btn.disabled = pending;
    }
  }

  function onFilesHeadingActivate(): void {
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
        await applyRoot(await requestRootChange("/api/root", { path }));
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
