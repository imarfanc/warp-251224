import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";
import { dirname, fromFileUrl, join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { Marked } from "npm:marked@12.0.1";
import { parse as parseYaml } from "npm:yaml@2.6.0";

const SERVER_DIR = dirname(fromFileUrl(import.meta.url));
const MDS_DIR = join(SERVER_DIR, "../mds");
const STATIC_DIR = join(SERVER_DIR, "static");
const marked = new Marked();

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

async function getMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    if (entry.isDirectory) {
      const subFiles = await getMarkdownFiles(`${dir}/${entry.name}`);
      files.push(...subFiles);
    } else if (entry.name.endsWith(".md")) {
      files.push(`${dir}/${entry.name}`);
    }
  }
  return files;
}

/** Reads each file's frontmatter and collects numeric `sort` for sidebar ordering. */
async function sortMetadataForFiles(relativePaths: string[]): Promise<Record<string, number>> {
  const sort: Record<string, number> = {};
  await Promise.all(relativePaths.map(async (rel) => {
    try {
      const fullPath = join(MDS_DIR, rel);
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

async function filesListPayload(relativePaths: string[]): Promise<{
  paths: string[];
  sort: Record<string, number>;
}> {
  return {
    paths: relativePaths,
    sort: await sortMetadataForFiles(relativePaths),
  };
}

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname;

  // Filter .md files by path substring or file body (case-insensitive)
  if (path === "/api/search") {
    const q = url.searchParams.get("q")?.trim() ?? "";
    try {
      const files = await getMarkdownFiles(MDS_DIR);
      const relativeFiles = files.map((f) => f.replace(`${MDS_DIR}/`, ""));
      if (!q) {
        return new Response(JSON.stringify(await filesListPayload(relativeFiles)), {
          headers: { "content-type": "application/json" },
        });
      }
      const lower = q.toLowerCase();
      const matches: string[] = [];
      for (const full of files) {
        const rel = full.replace(`${MDS_DIR}/`, "");
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
      matches.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
      return new Response(JSON.stringify(await filesListPayload(matches)), {
        headers: { "content-type": "application/json" },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return new Response(JSON.stringify({ error: message }), { status: 500 });
    }
  }

  // API to list markdown files (paths + optional frontmatter `sort` for tree ordering)
  if (path === "/api/files") {
    try {
      const files = await getMarkdownFiles(MDS_DIR);
      const relativeFiles = files.map((f) => f.replace(`${MDS_DIR}/`, ""));
      return new Response(JSON.stringify(await filesListPayload(relativeFiles)), {
        headers: { "content-type": "application/json" },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return new Response(JSON.stringify({ error: message }), { status: 500 });
    }
  }

  // API to get rendered markdown content
  if (path.startsWith("/api/content/")) {
    const fileName = decodeURIComponent(path.replace("/api/content/", ""));
    try {
      const fullPath = join(MDS_DIR, fileName);
      const content = await Deno.readTextFile(fullPath);
      const { body, frontmatter } = splitFrontmatter(content);
      const html = await marked.parse(body);
      let absolutePath = fullPath;
      try {
        absolutePath = await Deno.realPath(fullPath);
      } catch {
        // keep resolved join path
      }
      const payload: Record<string, unknown> = {
        html,
        title: fileName,
        absolutePath,
      };
      if (frontmatter !== null) {
        payload.frontmatter = frontmatter;
      }
      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return new Response(JSON.stringify({ error: message }), { status: 404 });
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
