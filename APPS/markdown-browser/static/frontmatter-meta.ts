/** Renders optional YAML frontmatter for display above article body (not-prose). */

function normalizeTags(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.filter((t): t is string => typeof t === "string" && t.trim() !== "");
}

function formatDate(v: unknown): string | null {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) {
        const d = new Date(v);
        if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return null;
}

/**
 * Builds a metadata block when at least one of title, category, description, date, or tags is present.
 * Omits internal keys like `sort`.
 */
export function buildFrontmatterMetaEl(
    fm: Record<string, unknown> | undefined,
    options?: { showTitle?: boolean },
): HTMLElement | null {
    if (!fm) return null;

    const title = options?.showTitle &&
            typeof fm.title === "string" && fm.title.trim() !== ""
        ? fm.title.trim()
        : null;
    const category = typeof fm.category === "string" && fm.category.trim() !== ""
        ? fm.category.trim()
        : null;
    const description =
        typeof fm.description === "string" && fm.description.trim() !== ""
            ? fm.description.trim()
            : null;
    const dateStr = formatDate(fm.date);
    const tags = normalizeTags(fm.tags);

    if (!title && !category && !description && !dateStr && tags.length === 0) {
        return null;
    }

    const root = document.createElement("div");
    root.className = "doc-meta";

    if (title) {
        const h = document.createElement("h1");
        h.className = "doc-meta__title";
        h.textContent = title;
        root.appendChild(h);
    }

    if (category) {
        const row = document.createElement("div");
        row.className = "doc-meta__row doc-meta__row--baseline";
        const lab = document.createElement("span");
        lab.className = "doc-meta__label";
        lab.textContent = "Category";
        const val = document.createElement("span");
        val.className = "doc-meta__value";
        val.textContent = category;
        row.appendChild(lab);
        row.appendChild(val);
        root.appendChild(row);
    }

    if (description) {
        const p = document.createElement("p");
        p.className = "doc-meta__description";
        p.textContent = description;
        root.appendChild(p);
    }

    if (dateStr) {
        const row = document.createElement("div");
        row.className = "doc-meta__row doc-meta__row--center";
        const icon = document.createElement("span");
        icon.className = "iconify doc-meta__icon";
        icon.setAttribute("data-icon", "mdi:calendar-outline");
        icon.setAttribute("aria-hidden", "true");
        const lab = document.createElement("span");
        lab.className = "sr-only";
        lab.textContent = "Date";
        const val = document.createElement("time");
        val.dateTime = dateStr;
        val.textContent = dateStr;
        row.appendChild(icon);
        row.appendChild(lab);
        row.appendChild(val);
        root.appendChild(row);
    }

    if (tags.length > 0) {
        const block = document.createElement("div");
        block.className = "doc-meta__block";
        const lab = document.createElement("div");
        lab.className = "doc-meta__label";
        lab.textContent = "Tags";
        const chips = document.createElement("div");
        chips.className = "doc-meta__chips";
        for (const t of tags) {
            const chip = document.createElement("span");
            chip.className = "doc-meta__chip";
            chip.textContent = t;
            chips.appendChild(chip);
        }
        block.appendChild(lab);
        block.appendChild(chips);
        root.appendChild(block);
    }

    return root;
}
