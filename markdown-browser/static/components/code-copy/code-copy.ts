/// <reference path="../../iconify-global.d.ts" />

import { CONFIG } from "../../config.ts";

const COPY_ICON = "mdi:content-copy";
const CHECK_ICON = "mdi:check";

/** Keyboard Maestro — same as vt/VALS/md `markdown-sections` Run. */
const RUN_TRIGGER_URL = "kmtrigger://macro=web_2_terminal";

function triggerRunMacro(): void {
    const launcher = document.createElement("iframe");
    launcher.style.display = "none";
    launcher.src = RUN_TRIGGER_URL;
    document.body.appendChild(launcher);
    window.setTimeout(() => {
        launcher.remove();
    }, 800);
}

/** Looks like `language-bash` or `language-bash:tmp1.sh` (fence info). */
function parseCodeBlockClass(code: HTMLElement): {
    langId: string | null;
    fenceFilename: string | null;
} {
    const cls = code.getAttribute("class") ?? "";
    const m = cls.match(/\blanguage-([^\s]+)/);
    if (!m) return { langId: null, fenceFilename: null };

    const raw = m[1];
    const colon = raw.indexOf(":");
    if (colon > 0) {
        const langPart = raw.slice(0, colon).toLowerCase();
        const filePart = raw.slice(colon + 1).trim();
        if (
            filePart.length > 0 &&
            (/\.[a-zA-Z0-9]{1,12}$/.test(filePart) || /[./\\]/.test(filePart))
        ) {
            if (langPart === "none" || langPart === "no-highlight") {
                return { langId: null, fenceFilename: filePart };
            }
            return { langId: langPart, fenceFilename: filePart };
        }
    }

    const id = raw.toLowerCase();
    if (id === "none" || id === "no-highlight") {
        return { langId: null, fenceFilename: null };
    }
    return { langId: id, fenceFilename: null };
}

function extractFilenameHint(source: string): string | null {
    const lines = source.split(/\r\n|\r|\n/).slice(0, 12);
    for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        const m1 = t.match(/^(?:\/\/|#)\s*(?:file|path|filename)\s*:\s*(.+)$/i);
        if (m1) return m1[1].trim();
        const m2 = t.match(/^\/\*\s*(?:file|path|filename)\s*:\s*(.+?)\s*\*\/$/i);
        if (m2) return m2[1].trim();
    }
    const first = lines.find((l) => l.trim().length > 0)?.trim() ?? "";
    if (
        /^[\w./\\~-]+\.[a-zA-Z0-9]{1,12}$/.test(first) &&
        !first.includes(" ")
    ) {
        return first;
    }
    return null;
}

/** Line count for display: trailing newlines after the last line do not add a line. */
function countLines(source: string): number {
    const trimmed = source.replace(/(?:\r\n|\r|\n)+$/, "");
    if (trimmed.length === 0) {
        return source.length === 0 ? 0 : 1;
    }
    return trimmed.split(/\r\n|\r|\n/).length;
}

function formatLineCount(n: number): string {
    if (n === 0) return "0 lines";
    if (n === 1) return "1 line";
    return `${n} lines`;
}

/** Strip trailing newlines from fenced block text (renderers often add one). */
function normalizeBlockClipboardText(text: string): string {
    return text.replace(/(?:\r\n|\r|\n)+$/, "");
}

function setIconifyIcon(el: Element | null, icon: string): void {
    if (!el || !el.classList.contains("iconify")) return;
    el.setAttribute("data-icon", icon);
}

async function copyText(
    text: string,
    button: HTMLButtonElement,
    mode: "block" | "inline",
): Promise<void> {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        return;
    }

    const iconEl = button.querySelector(".iconify");
    const label = button.querySelector(".code-copy__label");
    const prevIcon = iconEl?.getAttribute("data-icon") ?? COPY_ICON;
    const prevLabel = label?.textContent;

    setIconifyIcon(iconEl, CHECK_ICON);
    if (mode === "block" && label) label.textContent = "Copied";
    button.disabled = true;
    Iconify.scan(button);

    window.setTimeout(() => {
        setIconifyIcon(iconEl, prevIcon);
        if (mode === "block" && label) {
            label.textContent = prevLabel ?? "Copy";
        }
        button.disabled = false;
        Iconify.scan(button);
    }, 1600);
}

function makeIconSpan(icon: string): HTMLSpanElement {
    const s = document.createElement("span");
    s.className = "iconify";
    s.setAttribute("data-icon", icon);
    return s;
}

/** Fenced / indented code: `pre > code` */
export function enhanceCodeBlocks(prose: HTMLElement): void {
    const pres = prose.querySelectorAll("pre");
    for (const pre of pres) {
        if (pre.closest(".code-block-wrap")) continue;

        const code = pre.querySelector("code");
        const source = code?.textContent ?? pre.textContent ?? "";

        const wrap = document.createElement("div");
        wrap.className = "code-block-wrap";

        const toolbar = document.createElement("div");
        toolbar.className = "code-block-toolbar";

        const meta = document.createElement("div");
        meta.className = "code-block-meta";

        const { langId, fenceFilename } = code
            ? parseCodeBlockClass(code)
            : { langId: null, fenceFilename: null };
        const langEl = document.createElement("span");
        langEl.className = "code-block-lang";
        langEl.textContent = langId ?? "text";
        meta.appendChild(langEl);

        const filename = fenceFilename ?? extractFilenameHint(source);
        if (filename) {
            const sep1 = document.createElement("span");
            sep1.className = "code-block-meta-sep";
            sep1.setAttribute("aria-hidden", "true");
            sep1.textContent = "·";
            const fnEl = document.createElement("span");
            fnEl.className = "code-block-filename";
            fnEl.textContent = filename;
            fnEl.title = filename;
            meta.append(sep1, fnEl);
        }

        const sepLines = document.createElement("span");
        sepLines.className = "code-block-meta-sep";
        sepLines.setAttribute("aria-hidden", "true");
        sepLines.textContent = "·";
        const linesEl = document.createElement("span");
        linesEl.className = "code-block-lines";
        linesEl.textContent = formatLineCount(countLines(source));
        meta.append(sepLines, linesEl);

        const actions = document.createElement("div");
        actions.className = "code-block-actions";

        const runBtn = document.createElement("button");
        runBtn.type = "button";
        runBtn.className = "code-run-btn code-block-action-btn";
        runBtn.setAttribute("aria-label", "Run code");
        runBtn.title = "Run";
        const runLabel = document.createElement("span");
        runLabel.className = "code-block-action__text";
        runLabel.textContent = "Run";
        runBtn.append(makeIconSpan("mdi:play"), runLabel);

        let runResetTimer: ReturnType<typeof setTimeout> | null = null;
        runBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const c = pre.querySelector("code");
            const text = normalizeBlockClipboardText(
                c?.textContent ?? pre.textContent ?? "",
            );
            void navigator.clipboard
                .writeText(text)
                .catch(() => {
                    /* same as Copy: ignore clipboard errors */
                })
                .finally(() => {
                    triggerRunMacro();
                });

            runLabel.textContent = "Ran";
            runBtn.classList.add("is-ran");
            if (runResetTimer) clearTimeout(runResetTimer);
            runResetTimer = setTimeout(() => {
                runLabel.textContent = "Run";
                runBtn.classList.remove("is-ran");
            }, 1400);
        });

        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "code-copy-btn code-copy-btn--block code-block-action-btn";
        copyBtn.setAttribute("aria-label", "Copy code");

        const copyIcon = makeIconSpan(COPY_ICON);
        const label = document.createElement("span");
        label.className = "code-copy__label";
        label.textContent = "Copy";
        copyBtn.append(copyIcon, label);

        copyBtn.addEventListener("click", () => {
            const c = pre.querySelector("code");
            const text = normalizeBlockClipboardText(
                c?.textContent ?? pre.textContent ?? "",
            );
            void copyText(text, copyBtn, "block");
        });

        actions.append(runBtn, copyBtn);
        toolbar.append(meta, actions);

        pre.parentNode?.insertBefore(wrap, pre);
        wrap.append(toolbar, pre);

        if (CONFIG.codeBlock.maxHeight) {
            pre.style.maxHeight = CONFIG.codeBlock.maxHeight;
            pre.style.overflowY = "auto";
        }
    }
}

/** Inline `code` (not inside `pre`) */
export function enhanceInlineCode(prose: HTMLElement): void {
    const codes = prose.querySelectorAll("code");
    for (const code of codes) {
        if (code.closest("pre")) continue;
        if (code.closest(".inline-code-wrap")) continue;
        if (!(code.textContent?.trim())) continue;

        const wrap = document.createElement("span");
        wrap.className = "inline-code-wrap";

        const parent = code.parentNode;
        if (!parent) continue;

        parent.insertBefore(wrap, code);
        wrap.appendChild(code);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "code-copy-btn code-copy-btn--inline";
        btn.setAttribute("aria-label", "Copy snippet");
        btn.appendChild(makeIconSpan(COPY_ICON));

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const text = code.textContent ?? "";
            void copyText(text, btn, "inline");
        });

        wrap.appendChild(btn);
    }
}

export function enhanceProseCodeCopy(prose: HTMLElement): void {
    enhanceCodeBlocks(prose);
    enhanceInlineCode(prose);
}
