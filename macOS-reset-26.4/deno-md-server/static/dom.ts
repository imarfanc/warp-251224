/** Resolve a required element by id; throws if missing (fail-fast at bootstrap). */
export function getEl(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing required element: #${id}`);
    return el;
}
