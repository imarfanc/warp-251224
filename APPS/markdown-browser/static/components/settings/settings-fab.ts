/// <reference path="../../iconify-global.d.ts" />

import { CONFIG } from "../../config.ts";

type ThemeId = (typeof CONFIG.themes.options)[number]["id"];

function isThemeId(value: string | null): value is ThemeId {
    return CONFIG.themes.options.some((theme) => theme.id === value);
}

function readThemeId(): ThemeId {
    try {
        const saved = localStorage.getItem(CONFIG.themes.storageKey);
        if (isThemeId(saved)) return saved;
    } catch {
        /* ignore */
    }
    return CONFIG.themes.defaultId as ThemeId;
}

function writeThemeId(themeId: ThemeId): void {
    try {
        localStorage.setItem(CONFIG.themes.storageKey, themeId);
    } catch {
        /* ignore */
    }
}

function applyTheme(themeId: ThemeId): void {
    document.documentElement.dataset.theme = themeId;
}

function setPanelOpen(
    fab: HTMLButtonElement,
    panel: HTMLElement,
    isOpen: boolean,
): void {
    panel.hidden = !isOpen;
    fab.setAttribute("aria-expanded", isOpen ? "true" : "false");
    fab.title = isOpen ? "Close settings" : "Open settings";
}

function renderThemeOptions(panel: HTMLElement, selectedThemeId: ThemeId): void {
    const list = panel.querySelector<HTMLElement>("[data-settings-theme-list]");
    if (!list) return;

    list.replaceChildren();

    for (const theme of CONFIG.themes.options) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "settings-panel__theme";
        button.dataset.themeOption = theme.id;
        button.setAttribute(
            "aria-pressed",
            theme.id === selectedThemeId ? "true" : "false",
        );

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

function updateSelectedTheme(panel: HTMLElement, selectedThemeId: ThemeId): void {
    const buttons = panel.querySelectorAll<HTMLButtonElement>("[data-theme-option]");
    for (const button of buttons) {
        button.setAttribute(
            "aria-pressed",
            button.dataset.themeOption === selectedThemeId ? "true" : "false",
        );
    }
}

export function initSettingsFab(
    fab: HTMLButtonElement,
    panel: HTMLElement,
): void {
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
        const option = (event.target as Element | null)?.closest<HTMLButtonElement>(
            "[data-theme-option]",
        );
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
