/**
 * Global configuration for the Markdown Viewer.
 */
export const CONFIG = {
  favicon: "/favicon.svg",
  codeBlock: {
    /** Maximum height for code blocks (e.g., "500px", "60vh"). Set to null for no limit. */
    maxHeight: "600px",
  },
  sidebar: {
    /** Available width states for the sidebar. */
    states: [
      { id: "hidden", class: "sidebar-hidden", width: null },
      { id: "large", class: "", width: "w-96" },
      { id: "medium", class: "", width: "w-64" },
    ] as const,
    storageKey: "deno-md-viewer-sidebar-state-v2",
  },
  /** Sidebar file list: pin-to-top and dim (cross + blur) per path. */
  fileTree: {
    pinsStorageKey: "deno-md-viewer-file-pins",
    dimmedStorageKey: "deno-md-viewer-file-dimmed",
  },
  /**
   * macOS Marked 2 — `open` command (`?file=` POSIX path).
   * @see https://marked2app.com/help/URL_Handler.html
   */
  marked: {
    openBase: "x-marked://open",
  },
};
