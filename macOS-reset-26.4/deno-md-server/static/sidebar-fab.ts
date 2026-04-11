/// <reference path="./iconify-global.d.ts" />

const SIDEBAR_HIDDEN_KEY = "deno-md-viewer-sidebar-hidden";

function updateSidebarFabUi(sidebarFab: HTMLButtonElement, hidden: boolean): void {
    const icon = sidebarFab.querySelector(".iconify");
    if (icon) {
        icon.setAttribute("data-icon", hidden ? "mdi:chevron-right" : "mdi:chevron-left");
    }
    const label = hidden ? "Show sidebar" : "Hide sidebar";
    sidebarFab.setAttribute("aria-label", label);
    sidebarFab.title = label;
    Iconify.scan(sidebarFab);
}

function applySidebarHidden(sidebarFab: HTMLButtonElement, hidden: boolean): void {
    document.body.classList.toggle("sidebar-hidden", hidden);
    try {
        localStorage.setItem(SIDEBAR_HIDDEN_KEY, hidden ? "1" : "");
    } catch {
        /* ignore */
    }
    updateSidebarFabUi(sidebarFab, hidden);
}

/** Reads persisted state, applies layout, and wires the FAB click handler. */
export function initSidebarFab(sidebarFab: HTMLButtonElement): void {
    let hidden = false;
    try {
        hidden = localStorage.getItem(SIDEBAR_HIDDEN_KEY) === "1";
    } catch {
        /* ignore */
    }
    applySidebarHidden(sidebarFab, hidden);

    sidebarFab.addEventListener("click", () => {
        applySidebarHidden(
            sidebarFab,
            !document.body.classList.contains("sidebar-hidden"),
        );
    });
}
