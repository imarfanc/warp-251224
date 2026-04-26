import { getEl } from "../../dom.ts";

/**
 * Initializes the FAB that jumps to the next H2 heading in the content.
 */
export function initNextH2Fab(fab: HTMLButtonElement): void {
    fab.addEventListener("click", () => {
        const contentBody = getEl("content-body");
        const headings = Array.from(contentBody.querySelectorAll("h2"));
        
        if (headings.length === 0) return;

        // Find the first heading that is below the current scroll position
        // We use a small buffer (e.g., 10px) to avoid getting stuck on the current heading
        const viewportTop = window.scrollY || document.documentElement.scrollTop;
        const nextHeading = headings.find(h => {
            const rect = h.getBoundingClientRect();
            const absoluteTop = rect.top + window.scrollY;
            return absoluteTop > viewportTop + 10;
        });

        if (nextHeading) {
            nextHeading.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
            // If no next heading, wrap around to the first one
            headings[0].scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
    
    // Ensure Iconify scans the new button if it was added dynamically or contains data-icon
    if (typeof Iconify !== "undefined") {
        Iconify.scan(fab);
    }
}
