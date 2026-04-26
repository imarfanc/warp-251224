import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";
import {
  dirname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.224.0/path/mod.ts";
import { Marked } from "npm:marked@12.0.1";
import { parse as parseYaml } from "npm:yaml@2.6.0";

const SERVER_DIR = dirname(fromFileUrl(import.meta.url));
const CONFIG_PATH = join(SERVER_DIR, ".root-config.json");
const STATIC_DIR = join(SERVER_DIR, "static");
const marked = new Marked();

let currentRoot: string | null = await loadSavedRoot();

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function noRootSelectedResponse(): Response {
  return jsonResponse({ error: "No root selected" }, { status: 409 });
}

async function loadSavedRoot(): Promise<string | null> {
  try {
    const raw = await Deno.readTextFile(CONFIG_PATH);
    const parsed = JSON.parse(raw) as { root?: unknown };
    if (typeof parsed.root !== "string" || parsed.root.trim() === "") {
      return null;
    }
    return await validateAndResolveRoot(parsed.root);
  } catch {
    return null;
  }
}

async function saveRoot(root: string): Promise<void> {
  const tempPath = `${CONFIG_PATH}.tmp`;
  await Deno.writeTextFile(tempPath, `${JSON.stringify({ root }, null, 2)}\n`);
  await Deno.rename(tempPath, CONFIG_PATH);
}

async function validateAndResolveRoot(candidate: string): Promise<string> {
  const resolved = await Deno.realPath(candidate);
  const stat = await Deno.stat(resolved);
  if (!stat.isDirectory) {
    throw new Error("Path is not a directory");
  }
  return resolved;
}

async function setCurrentRoot(candidate: string): Promise<string> {
  const root = await validateAndResolveRoot(candidate);
  await saveRoot(root);
  currentRoot = root;
  return root;
}

async function requireCurrentRoot(): Promise<string | Response> {
  if (currentRoot === null) {
    return noRootSelectedResponse();
  }
  return currentRoot;
}

function isPathInside(root: string, candidate: string): boolean {
  const normalizedRoot = root.replace(/\\/g, "/").replace(/\/$/, "");
  const normalizedCandidate = candidate.replace(/\\/g, "/");
  return normalizedCandidate === normalizedRoot ||
    normalizedCandidate.startsWith(`${normalizedRoot}/`);
}

async function resolvePathWithinRoot(
  root: string,
  relativePath: string,
): Promise<string> {
  const joined = join(root, relativePath);
  let resolved = joined;
  try {
    resolved = await Deno.realPath(joined);
  } catch {
    // Keep the joined path so missing files still return a useful error below.
  }
  if (!isPathInside(root, resolved)) {
    throw new Error("Path is outside root");
  }
  return resolved;
}

/** Leading `---` YAML block; on parse failure the full source is returned unchanged. */
function splitFrontmatter(raw: string): {
  body: string;
  frontmatter: Record<string, unknown> | null;
} {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { body: raw, frontmatter: null };
  try {
    const parsed = parseYaml(m[1]);
    if (parsed === null || parsed === undefined) {
      return { body: raw.slice(m[0].length), frontmatter: {} };
    }
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      return { body: raw, frontmatter: null };
    }
    return {
      body: raw.slice(m[0].length),
      frontmatter: parsed as Record<string, unknown>,
    };
  } catch {
    return { body: raw, frontmatter: null };
  }
}

function isMarkdownFile(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown");
}

function isHtmlFile(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith(".html") || lower.endsWith(".htm");
}

function isSupportedFile(path: string): boolean {
  return isMarkdownFile(path) || isHtmlFile(path);
}

async function getDocumentFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    if (entry.isDirectory) {
      const subFiles = await getDocumentFiles(`${dir}/${entry.name}`);
      files.push(...subFiles);
    } else if (isSupportedFile(entry.name)) {
      files.push(`${dir}/${entry.name}`);
    }
  }
  return files;
}

/** Reads each file's frontmatter and collects numeric `sort` for sidebar ordering. */
async function sortMetadataForFiles(
  root: string,
  relativePaths: string[],
): Promise<Record<string, number>> {
  const sort: Record<string, number> = {};
  await Promise.all(relativePaths.map(async (rel) => {
    if (!isMarkdownFile(rel)) return;
    try {
      const fullPath = join(root, rel);
      const raw = await Deno.readTextFile(fullPath);
      const { frontmatter } = splitFrontmatter(raw);
      if (frontmatter === null) return;
      const s = frontmatter.sort;
      if (typeof s === "number" && Number.isFinite(s)) {
        sort[rel] = s;
      }
    } catch {
      // skip unreadable
    }
  }));
  return sort;
}

async function filesListPayload(
  root: string,
  relativePaths: string[],
): Promise<{
  paths: string[];
  sort: Record<string, number>;
}> {
  return {
    paths: relativePaths,
    sort: await sortMetadataForFiles(root, relativePaths),
  };
}

function relativeFilesForRoot(root: string, files: string[]): string[] {
  return files.map((f) => f.replace(`${root}/`, ""));
}

async function pickRootWithOsascript(): Promise<string> {
  const command = new Deno.Command("osascript", {
    args: [
      "-e",
      'POSIX path of (choose folder with prompt "Select markdown root")',
    ],
  });
  const { success, code, stdout, stderr } = await command.output();
  if (!success) {
    const message = new TextDecoder().decode(stderr).trim();
    if (code === 1) {
      throw new Error("Folder selection cancelled");
    }
    throw new Error(message || "Folder picker failed");
  }
  return new TextDecoder().decode(stdout).trim();
}

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/api/root" && req.method === "GET") {
    return jsonResponse({ root: currentRoot });
  }

  if (path === "/api/root" && req.method === "POST") {
    try {
      const { path: candidate } = await req.json() as { path?: unknown };
      if (typeof candidate !== "string" || candidate.trim() === "") {
        return jsonResponse({ error: "Missing path" }, { status: 400 });
      }
      const root = await setCurrentRoot(candidate);
      return jsonResponse({ root });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return jsonResponse({ error: message }, { status: 400 });
    }
  }

  if (path === "/api/pick-root" && req.method === "POST") {
    try {
      const root = await setCurrentRoot(await pickRootWithOsascript());
      return jsonResponse({ root });
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return jsonResponse({ error: "osascript not found" }, { status: 500 });
      }
      const message = e instanceof Error ? e.message : String(e);
      const status = message === "Folder selection cancelled" ? 400 : 500;
      return jsonResponse({ error: message }, { status });
    }
  }

  // Filter supported files by path substring or file body (case-insensitive)
  if (path === "/api/search") {
    const root = await requireCurrentRoot();
    if (root instanceof Response) return root;

    const q = url.searchParams.get("q")?.trim() ?? "";
    try {
      const files = await getDocumentFiles(root);
      const relativeFiles = relativeFilesForRoot(root, files);
      if (!q) {
        return jsonResponse(await filesListPayload(root, relativeFiles));
      }
      const lower = q.toLowerCase();
      const matches: string[] = [];
      for (const full of files) {
        const rel = full.replace(`${root}/`, "");
        if (rel.toLowerCase().includes(lower)) {
          matches.push(rel);
          continue;
        }
        try {
          const text = await Deno.readTextFile(full);
          if (text.toLowerCase().includes(lower)) {
            matches.push(rel);
          }
        } catch {
          // skip unreadable
        }
      }
      matches.sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
      return jsonResponse(await filesListPayload(root, matches));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return jsonResponse({ error: message }, { status: 500 });
    }
  }

  // API to list markdown/html files (paths + optional markdown frontmatter `sort` for tree ordering)
  if (path === "/api/files") {
    const root = await requireCurrentRoot();
    if (root instanceof Response) return root;

    try {
      const files = await getDocumentFiles(root);
      const relativeFiles = relativeFilesForRoot(root, files);
      return jsonResponse(await filesListPayload(root, relativeFiles));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return jsonResponse({ error: message }, { status: 500 });
    }
  }

  // API to get rendered markdown or raw HTML content
  if (path.startsWith("/api/content/")) {
    const root = await requireCurrentRoot();
    if (root instanceof Response) return root;

    const fileName = decodeURIComponent(path.replace("/api/content/", ""));
    try {
      if (!isSupportedFile(fileName)) {
        return jsonResponse({ error: "Unsupported file type" }, {
          status: 415,
        });
      }
      const fullPath = await resolvePathWithinRoot(root, fileName);
      const content = await Deno.readTextFile(fullPath);
      if (isHtmlFile(fileName)) {
        return jsonResponse({
          kind: "html",
          html: content,
          title: fileName,
          absolutePath: fullPath,
        });
      }
      const { body, frontmatter } = splitFrontmatter(content);
      const html = await marked.parse(body);
      const payload: Record<string, unknown> = {
        kind: "markdown",
        html,
        title: fileName,
        absolutePath: fullPath,
      };
      if (frontmatter !== null) {
        payload.frontmatter = frontmatter;
      }
      return jsonResponse(payload);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const status = message === "Path is outside root" ? 403 : 404;
      return jsonResponse({ error: message }, { status });
    }
  }

  if (path === "/api/open-in-cursor" && req.method === "POST") {
    const workspaceRoot = await requireCurrentRoot();
    if (workspaceRoot instanceof Response) return workspaceRoot;

    try {
      const { absolutePath } = await req.json() as { absolutePath?: unknown };
      if (typeof absolutePath !== "string" || absolutePath.length === 0) {
        return jsonResponse({ error: "Missing absolutePath" }, { status: 400 });
      }

      let realAbsolutePath = absolutePath;
      try {
        realAbsolutePath = await Deno.realPath(absolutePath);
      } catch {
        // keep provided path if it still exists logically
      }

      if (!isPathInside(workspaceRoot, realAbsolutePath)) {
        return jsonResponse({ error: "Path is outside workspace" }, {
          status: 403,
        });
      }

      const command = new Deno.Command("cursor", {
        args: ["--new-window", workspaceRoot, realAbsolutePath],
      });
      const { success, stderr } = await command.output();
      if (!success) {
        const message = new TextDecoder().decode(stderr).trim() ||
          "Cursor CLI failed";
        return jsonResponse({ error: message }, { status: 500 });
      }

      return jsonResponse({ ok: true });
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return jsonResponse({ error: "Cursor CLI not found" }, { status: 500 });
      }
      const message = e instanceof Error ? e.message : String(e);
      return jsonResponse({ error: message }, { status: 500 });
    }
  }

  // Serve static files (frontend)
  return serveDir(req, {
    fsRoot: STATIC_DIR,
    quiet: true,
  });
};

console.log("Server running on http://localhost:8000");
Deno.serve({ port: 8000 }, handler);
