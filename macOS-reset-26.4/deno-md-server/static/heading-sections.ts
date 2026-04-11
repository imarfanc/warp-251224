/** Per-`h2` collapse + blur controls; mirrors vt/VALS/md markdown-sections behavior. */

const STORAGE_PREFIX = "md-viewer:sections";

function slugify(text: string): string {
    return (
        text
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") || "section"
    );
}

function boolFromStorage(key: string): boolean {
    try {
        return localStorage.getItem(key) === "1";
    } catch {
        return false;
    }
}

function writeBoolToStorage(key: string, value: boolean): void {
    try {
        localStorage.setItem(key, value ? "1" : "0");
    } catch {
        // private mode / quota
    }
}

function keyFor(
    storageKey: string,
    sectionKey: string,
    field: "collapsed" | "blurred",
): string {
    return `${storageKey}:${sectionKey}:${field}`;
}

type Section = {
    key: string;
    heading: HTMLHeadingElement;
    body: HTMLDivElement;
    collapseButton: HTMLButtonElement;
    blurButton: HTMLButtonElement;
};

type ProseWithCleanup = HTMLElement & {
    __headingSectionsCleanup?: () => void;
};

const COLLAPSE_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M18 15l-6-6-6 6"/>' +
    "</svg>";

const BLUR_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 21a9 9 0 1 0 0 -18a9 9 0 0 0 0 18z"/>' +
    '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3a9 9 0 0 1 0 18"/>' +
    '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/>' +
    "</svg>";

/**
 * Wraps content under each `h2` and adds collapse/blur toggles. Idempotent if run again after `cleanup`.
 */
export function enhanceHeadingSections(
    prose: HTMLElement,
    options: { storageKey: string },
): void {
    const storageKey = options.storageKey;
    const root = prose as ProseWithCleanup;

    const prevCleanup = root.__headingSectionsCleanup;
    if (typeof prevCleanup === "function") {
        prevCleanup();
    }

    const headings = Array.from(prose.querySelectorAll<HTMLHeadingElement>("h2"));
    if (headings.length === 0) {
        root.__headingSectionsCleanup = undefined;
        return;
    }

    const detach: Array<() => void> = [];
    const sections: Section[] = [];

    function on(
        target: EventTarget,
        type: string,
        handler: (ev: Event) => void,
        opts?: boolean | AddEventListenerOptions,
    ): void {
        target.addEventListener(type, handler, opts);
        detach.push(() =>
            target.removeEventListener(type, handler, opts)
        );
    }

    headings.forEach((heading, index) => {
        if (heading.querySelector(".md-h2-collapse-btn")) {
            return;
        }

        const sectionKey = `${slugify(heading.textContent ?? "")}-${index}`;

        heading.classList.add("md-h2");
        heading.dataset.mdSectionKey = sectionKey;

        const collapseButton = document.createElement("button");
        collapseButton.type = "button";
        collapseButton.className = "md-h2-action-btn md-h2-collapse-btn";
        collapseButton.setAttribute("aria-label", "Collapse heading");
        collapseButton.innerHTML = COLLAPSE_SVG;

        const blurButton = document.createElement("button");
        blurButton.type = "button";
        blurButton.className = "md-h2-action-btn md-h2-blur-btn";
        blurButton.setAttribute("aria-label", "Blur content");
        blurButton.innerHTML = BLUR_SVG;

        heading.append(collapseButton, blurButton);

        const body = document.createElement("div");
        body.className = "md-section-body";
        body.dataset.mdSectionBody = sectionKey;

        let cursor: ChildNode | null = heading.nextSibling;
        while (
            cursor != null &&
            !(
                cursor.nodeType === Node.ELEMENT_NODE &&
                (cursor as Element).tagName === "H2"
            )
        ) {
            const next = cursor.nextSibling;
            body.appendChild(cursor);
            cursor = next;
        }

        heading.parentNode?.insertBefore(body, cursor);

        sections.push({
            key: sectionKey,
            heading,
            body,
            collapseButton,
            blurButton,
        });
    });

    const getState = (section: Section) => ({
        collapsed: boolFromStorage(keyFor(storageKey, section.key, "collapsed")),
        blurred: boolFromStorage(keyFor(storageKey, section.key, "blurred")),
    });

    const setState = (
        section: Section,
        field: "collapsed" | "blurred",
        value: boolean,
    ) => {
        writeBoolToStorage(keyFor(storageKey, section.key, field), value);
    };

    const applyState = (section: Section) => {
        const sectionState = getState(section);
        section.body.classList.toggle("is-collapsed", sectionState.collapsed);
        section.body.classList.toggle("is-blurred", sectionState.blurred);

        section.collapseButton.setAttribute(
            "aria-label",
            sectionState.collapsed ? "Expand heading" : "Collapse heading",
        );
        section.blurButton.setAttribute(
            "aria-label",
            sectionState.blurred ? "Unblur content" : "Blur content",
        );

        section.collapseButton.classList.toggle(
            "is-expanded",
            !sectionState.collapsed,
        );
        section.blurButton.classList.toggle("is-blurred", sectionState.blurred);
    };

    for (const section of sections) {
        applyState(section);

        on(section.collapseButton, "click", (event) => {
            event.stopPropagation();
            const nextCollapsed = !boolFromStorage(
                keyFor(storageKey, section.key, "collapsed"),
            );
            setState(section, "collapsed", nextCollapsed);
            applyState(section);
        });

        on(section.blurButton, "click", (event) => {
            event.stopPropagation();
            const nextBlurred = !boolFromStorage(
                keyFor(storageKey, section.key, "blurred"),
            );
            setState(section, "blurred", nextBlurred);
            applyState(section);
        });
    }

    const cleanup = () => {
        while (detach.length) {
            const off = detach.pop();
            off?.();
        }
        for (const section of sections) {
            if (section.collapseButton.parentNode === section.heading) {
                section.heading.removeChild(section.collapseButton);
            }
            if (section.blurButton.parentNode === section.heading) {
                section.heading.removeChild(section.blurButton);
            }
            if (section.body.parentNode) {
                const parent = section.body.parentNode;
                while (section.body.firstChild) {
                    parent.insertBefore(section.body.firstChild, section.body);
                }
                parent.removeChild(section.body);
            }
            section.heading.classList.remove("md-h2");
            delete section.heading.dataset.mdSectionKey;
        }
        root.__headingSectionsCleanup = undefined;
    };

    root.__headingSectionsCleanup = cleanup;
}

/** Stable localStorage namespace for the current markdown file path. */
export function storageKeyForFile(filePath: string): string {
    return `${STORAGE_PREFIX}:${filePath}`;
}
