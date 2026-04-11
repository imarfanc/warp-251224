/**
 * Subset of the browser global from
 * {@link https://cdnjs.cloudflare.com/ajax/libs/iconify/3.1.1/iconify.min.js}
 *
 * Full API types (module-oriented, uses `@iconify/types`):
 * {@link https://cdnjs.cloudflare.com/ajax/libs/iconify/3.1.1/iconify.d.ts}
 */
declare const Iconify: {
    scan(root?: HTMLElement | null): void;
    loadIcons(
        icons: (string | { provider: string; prefix: string; name: string })[],
        callback?: () => void,
    ): { abort: () => void };
};
