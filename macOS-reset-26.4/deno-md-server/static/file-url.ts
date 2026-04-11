/** Query param used for deep-linking to the open markdown file. */
export const FILE_QUERY = "file";

export type UrlSyncMode = "push" | "replace" | "none";

export function getFileFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    const f = params.get(FILE_QUERY);
    return f && f.length > 0 ? f : null;
}

export function setFileInUrl(file: string, replace: boolean): void {
    const url = new URL(window.location.href);
    url.searchParams.set(FILE_QUERY, file);
    history[replace ? "replaceState" : "pushState"]({}, "", url);
}

/** Apply history update for the current file when {@link UrlSyncMode} is not `none`. */
export function syncFileToUrl(file: string, mode: UrlSyncMode): void {
    if (mode === "push") setFileInUrl(file, false);
    else if (mode === "replace") setFileInUrl(file, true);
}
