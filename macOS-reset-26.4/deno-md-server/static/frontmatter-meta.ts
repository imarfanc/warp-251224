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
    root.className =
        "doc-meta not-prose space-y-3.5 mb-8 p-6 bg-orange-50/50 rounded-xl border border-orange-100/80";

    if (title) {
        const h = document.createElement("h1");
        h.className =
            "doc-meta__title text-2xl font-semibold text-slate-900 tracking-tight leading-snug";
        h.textContent = title;
        root.appendChild(h);
    }

    if (category) {
        const row = document.createElement("div");
        row.className = "flex flex-wrap items-baseline gap-x-2 gap-y-1";
        const lab = document.createElement("span");
        lab.className =
            "text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 shrink-0";
        lab.textContent = "Category";
        const val = document.createElement("span");
        val.className = "text-sm text-slate-700";
        val.textContent = category;
        row.appendChild(lab);
        row.appendChild(val);
        root.appendChild(row);
    }

    if (description) {
        const p = document.createElement("p");
        p.className = "text-sm text-slate-600 leading-relaxed max-w-2xl";
        p.textContent = description;
        root.appendChild(p);
    }

    if (dateStr) {
        const row = document.createElement("div");
        row.className = "flex flex-wrap items-center gap-2 text-sm text-slate-600";
        const icon = document.createElement("span");
        icon.className = "iconify shrink-0 text-slate-400";
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
        block.className = "space-y-1.5";
        const lab = document.createElement("div");
        lab.className =
            "text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500";
        lab.textContent = "Tags";
        const chips = document.createElement("div");
        chips.className = "flex flex-wrap gap-2";
        for (const t of tags) {
            const chip = document.createElement("span");
            chip.className =
                "inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200/90";
            chip.textContent = t;
            chips.appendChild(chip);
        }
        block.appendChild(lab);
        block.appendChild(chips);
        root.appendChild(block);
    }

    return root;
}
