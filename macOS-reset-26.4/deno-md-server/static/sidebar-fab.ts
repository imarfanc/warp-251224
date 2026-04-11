/// <reference path="./iconify-global.d.ts" />

import { CONFIG } from "./config.ts";

function getSidebar(): HTMLElement {
    const el = document.getElementById("sidebar");
    if (!el) throw new Error("Missing required element: #sidebar");
    return el;
}

function updateSidebarFabUi(sidebarFab: HTMLButtonElement, stateId: string): void {
    const icon = sidebarFab.querySelector(".iconify");
    if (icon) {
        // If hidden, point right to show it. If visible (any width), point left to hide/cycle.
        icon.setAttribute("data-icon", stateId === "hidden" ? "mdi:chevron-right" : "mdi:chevron-left");
    }
    const label = stateId === "hidden" ? "Show sidebar" : "Cycle sidebar width / Hide";
    sidebarFab.setAttribute("aria-label", label);
    sidebarFab.title = label;
    Iconify.scan(sidebarFab);
}

function applySidebarState(sidebarFab: HTMLButtonElement, stateId: string): void {
    const sidebar = getSidebar();
    const state = CONFIG.sidebar.states.find((s) => s.id === stateId) || CONFIG.sidebar.states[1];

    // 1. Toggle body classes for hidden state
    document.body.classList.toggle("sidebar-hidden", state.id === "hidden");

    // 2. Manage width classes on #sidebar
    for (const s of CONFIG.sidebar.states) {
        if (s.width) sidebar.classList.remove(s.width);
    }
    if (state.width) sidebar.classList.add(state.width);

    // 3. Persist
    try {
        localStorage.setItem(CONFIG.sidebar.storageKey, state.id);
    } catch {
        /* ignore */
    }

    updateSidebarFabUi(sidebarFab, state.id);
}

/** Reads persisted state, applies layout, and wires the FAB click handler. */
export function initSidebarFab(sidebarFab: HTMLButtonElement): void {
    let stateId = "medium";
    try {
        const saved = localStorage.getItem(CONFIG.sidebar.storageKey);
        if (saved && CONFIG.sidebar.states.some((s) => s.id === saved)) {
            stateId = saved;
        }
    } catch {
        /* ignore */
    }
    applySidebarState(sidebarFab, stateId);

    sidebarFab.addEventListener("click", () => {
        const saved = localStorage.getItem(CONFIG.sidebar.storageKey) || "medium";
        const currentIndex = CONFIG.sidebar.states.findIndex((s) => s.id === saved);
        const nextIndex = (currentIndex + 1) % CONFIG.sidebar.states.length;
        const nextState = CONFIG.sidebar.states[nextIndex];
        applySidebarState(sidebarFab, nextState.id);
    });
}
