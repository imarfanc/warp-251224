# Plan: Transform App to Files API Manager

## Summary
Remove existing Todo, Notes, Admin, and macOS Reset apps. Replace with a Files API manager (similar to `wiki/tmp/`) using the working Deno KV, SvelteKit, and daisyUI stack.

## Requirements
- **Storage**: Deno KV (keep existing)
- **Auth**: API key via `X-API-Key` header
- **Frontend**: SvelteKit + daisyUI (adapt React components to Svelte)
- **Features**: CRUD files, grouping (week/year, year, extension, prefix), sorting (filename, date)

---

## Phase 1: Delete Old Files

### Routes to delete:
- `src/routes/todo/+page.svelte`
- `src/routes/notes/+page.svelte`
- `src/routes/admin/+page.svelte`
- `src/routes/macos-reset/+page.svelte`

### API routes to delete:
- `src/routes/api/todos/+server.ts`
- `src/routes/api/notes/+server.ts`
- `src/routes/api/stats/+server.ts`
- `src/routes/api/kv-raw/+server.ts`

### Components to delete:
- `src/lib/components/CodeBlock.svelte`

---

## Phase 2: Core Infrastructure

### 2.1 Create `src/lib/types.ts`
```typescript
export type SortOption = "filename_asc" | "filename_desc" | "date_asc" | "date_desc";
export type GroupOption = "none" | "year_week" | "year" | "extension" | "prefix";

export interface FileItem {
  filename: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}
```

### 2.2 Modify `src/lib/server/kv.ts`
- Remove `Todo` and `Note` interfaces
- Add `FileItem` interface
- Keep `getKv()` function as-is

### 2.3 Create `src/hooks.server.ts`
API key middleware for `/api/files/*` routes:
- Check `X-API-Key` header against `FILES_API_KEY` env var
- Return 401 if missing/invalid

### 2.4 Add dependency
```bash
npm install date-fns
```

---

## Phase 3: API Routes

### 3.1 Create `src/routes/api/files/+server.ts`
| Method | Action |
|--------|--------|
| GET | List files (with `sort_by`, `group_by` query params) |
| POST | Create file (`{filename, content}`) - return 409 if exists |

### 3.2 Create `src/routes/api/files/[filename]/+server.ts`
| Method | Action |
|--------|--------|
| GET | Get file with content |
| PUT | Update file content |
| DELETE | Delete file |

### KV Key Structure
```
["files", "<filename>"] → FileItem
```

---

## Phase 4: Components

Create in `src/lib/components/`:

| Component | Purpose |
|-----------|---------|
| `Modal.svelte` | Reusable modal wrapper (escape to close, backdrop click) |
| `AuthModal.svelte` | API key input, blocks UI until authenticated |
| `FileForm.svelte` | Create file form (filename + content inputs) |
| `FileViewer.svelte` | Display file content with copy button |
| `FileCard.svelte` | Individual file card (name, date, view/delete buttons) |
| `FileList.svelte` | Grid of FileCards with group headers |

---

## Phase 5: Main Page

### 5.1 Rewrite `src/routes/+page.svelte`

**State:**
```typescript
let files = $state<FileItem[]>([]);
let apiKey = $state<string | null>(null);  // localStorage
let sortBy = $state<SortOption>("date_desc");
let groupBy = $state<GroupOption>("year_week");
let isAuthModalOpen = $state(true);
let isCreateModalOpen = $state(false);
let selectedFile = $state<FileItem | null>(null);
```

**Layout:**
- Header: Title, sort/group selects, "New File" button, "Disconnect" button
- FileList with grouped files
- AuthModal (blocks until key entered)
- Create Modal with FileForm
- View Modal with FileViewer

### 5.2 Update `src/routes/+layout.svelte`
- Change branding to "Files Manager"
- Optional: Add API key status indicator

---

## Data Model

```typescript
// KV entry
["files", "example.txt"] → {
  filename: "example.txt",
  content: "Hello world",
  createdAt: 1705500000000,
  updatedAt: 1705500000000
}
```

---

## Grouping Logic (from wiki/tmp/)

```typescript
import { getWeek, getYear } from 'date-fns';

function groupFiles(files: FileItem[], groupBy: GroupOption) {
  switch (groupBy) {
    case "none": return { "": files };
    case "year_week": // Week 3, 2024
    case "year": // 2024
    case "extension": // .txt, .md, no extension
    case "prefix": // Split on first - or _
  }
}
```

---

## Verification

1. **Start dev server**: `npm run dev`
2. **Set env var**: `FILES_API_KEY=test123`
3. **Test auth**:
   - Visit app → AuthModal appears
   - Enter key → modal closes, can access
   - Invalid key → 401 response
4. **Test CRUD**:
   - Create file → appears in list
   - View file → modal shows content
   - Delete file → removed from list
5. **Test grouping/sorting**:
   - Change group select → files regroup
   - Change sort select → files reorder

---

## Critical Files

| File | Purpose |
|------|---------|
| `src/lib/server/kv.ts` | KV connection (modify) |
| `src/routes/api/notes/+server.ts` | Pattern for API routes |
| `src/routes/notes/+page.svelte` | Pattern for Svelte 5 state, modals, daisyUI |
| `wiki/tmp/backend/index.ts` | Reference for grouping/sorting logic |
| `wiki/tmp/frontend/components/*.tsx` | Reference for component logic |
