/// <reference path="./iconify-global.d.ts" />
import { attachSidebarSearch } from "./file-search.ts";
import { FileTreeView } from "./file-tree.ts";
import { getEl } from "./dom.ts";
import { initSidebarFab } from "./sidebar-fab.ts";
import {
    loadInitialFileList,
    registerPopstateHandler,
    selectFile,
} from "./document-loader.ts";
import { renderContentPlaceholder } from "./content-fragments.ts";

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
const contentBody = getEl("content-body");
const docPathEl = getEl("doc-path");
const fileSearchInput = getEl("file-search") as HTMLInputElement;
const sidebarFab = getEl("sidebar-fab") as HTMLButtonElement;

const tree = new FileTreeView(
    fileListEl,
    (path) => {
        void selectFile({ tree, contentBody, docPathEl }, path);
    },
    pinnedFilesEl,
);

const dom = { tree, contentBody, docPathEl };

attachSidebarSearch(fileSearchInput, tree);
initSidebarFab(sidebarFab);

updateFavicon();
renderContentPlaceholder(contentBody);
registerPopstateHandler(dom);
void loadInitialFileList(dom);
