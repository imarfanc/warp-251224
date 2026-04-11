/** Id of `<template>` in index.html for the empty selection state (single source of truth). */
export const PLACEHOLDER_TEMPLATE_ID = "content-placeholder-tpl";

export function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

const FALLBACK_PLACEHOLDER_HTML =
    '<div class="text-gray-400 italic placeholder-msg">Select a file from the sidebar to view its content.</div>';

/** Empty / “pick a file” state — clones `#content-placeholder-tpl` when present. */
export function renderContentPlaceholder(container: HTMLElement): void {
    const tpl = document.getElementById(PLACEHOLDER_TEMPLATE_ID);
    if (tpl instanceof HTMLTemplateElement) {
        container.replaceChildren(tpl.content.cloneNode(true));
        return;
    }
    container.innerHTML = FALLBACK_PLACEHOLDER_HTML;
}

export function renderContentLoading(container: HTMLElement): void {
    container.innerHTML =
        '<div class="animate-pulse text-gray-400">Loading...</div>';
}

export function renderContentError(container: HTMLElement, message: string): void {
    container.innerHTML =
        `<div class="text-red-500">Error: ${escapeHtml(message)}</div>`;
}

export function renderContentInvalidResponse(container: HTMLElement): void {
    container.innerHTML =
        '<div class="text-red-500">Error: invalid response</div>';
}

export function renderContentFetchFailed(container: HTMLElement): void {
    container.innerHTML =
        '<div class="text-red-500">Error loading content</div>';
}
