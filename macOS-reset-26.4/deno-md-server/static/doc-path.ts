/** Render path like `1 > brew.md` with folder crumbs vs filename colors. */
export function setDocPathDisplay(docPathEl: HTMLElement, path: string): void {
    docPathEl.textContent = "";
    const parts = path.split("/").filter((p) => p.length > 0);
    if (parts.length === 0) {
        const fallback = document.createElement("span");
        fallback.className = "doc-path__leaf";
        fallback.textContent = path;
        docPathEl.appendChild(fallback);
        docPathEl.classList.remove("hidden");
        return;
    }
    for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
            docPathEl.appendChild(document.createTextNode(" "));
            const sep = document.createElement("span");
            sep.className = "doc-path__sep";
            sep.textContent = ">";
            sep.setAttribute("aria-hidden", "true");
            docPathEl.appendChild(sep);
            docPathEl.appendChild(document.createTextNode(" "));
        }
        const span = document.createElement("span");
        span.className = i === parts.length - 1
            ? "doc-path__leaf"
            : "doc-path__crumb";
        span.textContent = parts[i];
        docPathEl.appendChild(span);
    }
    docPathEl.classList.remove("hidden");
}

export function clearDocPath(docPathEl: HTMLElement): void {
    docPathEl.textContent = "";
    docPathEl.classList.add("hidden");
}
