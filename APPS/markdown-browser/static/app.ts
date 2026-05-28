/// <reference path="./iconify-global.d.ts" />
import { attachSidebarSearch } from "./file-search.ts";
import { FileTreeView } from "./components/file-tree/file-tree.ts";
import { getEl } from "./dom.ts";
import { initSidebarFab } from "./components/sidebar-fab/sidebar-fab.ts";
import { initNextH2Fab } from "./components/next-h2-fab/next-h2-fab.ts";
import { initSettingsFab } from "./components/settings/settings-fab.ts";
import {
  loadInitialFileList,
  registerPopstateHandler,
  selectFile,
} from "./document-loader.ts";
import {
  renderChooseRootPlaceholder,
  renderContentPlaceholder,
} from "./content-fragments.ts";
import { clearDocPath } from "./doc-path.ts";
import { clearFileFromUrl } from "./file-url.ts";
import { initRootPicker } from "./root-picker.ts";

import { CONFIG } from "./config.ts";

function updateFavicon(): void {
  const link = (document.querySelector("link[rel*='icon']") ||
    document.createElement("link")) as HTMLLinkElement;
  link.type = "image/svg+xml";
  link.rel = "icon";
  link.href = CONFIG.favicon;
  document.getElementsByTagName("head")[0].appendChild(link);
}

const fileListEl = getEl("file-list");
const pinnedFilesEl = getEl("pinned-files");
const appMain = document.querySelector<HTMLElement>(".app-main");
if (!appMain) throw new Error("Missing required element: .app-main");
const contentShell = getEl("content");
const contentBody = getEl("content-body");
const docPathEl = getEl("doc-path");
const fileSearchInput = getEl("file-search") as HTMLInputElement;
const sidebarFab = getEl("sidebar-fab") as HTMLButtonElement;
const nextH2Fab = getEl("next-h2-fab") as HTMLButtonElement;
const settingsFab = getEl("settings-fab") as HTMLButtonElement;
const settingsPanel = getEl("settings-panel");

const tree = new FileTreeView(
  fileListEl,
  (path) => {
    void selectFile(
      { tree, appMain, contentShell, contentBody, docPathEl },
      path,
    );
  },
  pinnedFilesEl,
);

const dom = { tree, appMain, contentShell, contentBody, docPathEl };

attachSidebarSearch(fileSearchInput, tree);
initSidebarFab(sidebarFab);
initNextH2Fab(nextH2Fab);
initSettingsFab(settingsFab, settingsPanel);

updateFavicon();
renderContentPlaceholder(contentBody);
registerPopstateHandler(dom);

async function handleRootChanged(): Promise<void> {
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
