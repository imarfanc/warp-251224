import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";
import { dirname, fromFileUrl, join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { Marked } from "npm:marked@12.0.1";

const SERVER_DIR = dirname(fromFileUrl(import.meta.url));
const MDS_DIR = join(SERVER_DIR, "../mds");
const STATIC_DIR = join(SERVER_DIR, "static");
const marked = new Marked();

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

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname;

  // Filter .md files by path substring or file body (case-insensitive)
  if (path === "/api/search") {
    const q = url.searchParams.get("q")?.trim() ?? "";
    try {
      const files = await getMarkdownFiles(MDS_DIR);
      if (!q) {
        const relativeFiles = files.map((f) => f.replace(`${MDS_DIR}/`, ""));
        return new Response(JSON.stringify(relativeFiles), {
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
      return new Response(JSON.stringify(matches), {
        headers: { "content-type": "application/json" },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return new Response(JSON.stringify({ error: message }), { status: 500 });
    }
  }

  // API to list markdown files
  if (path === "/api/files") {
    try {
      const files = await getMarkdownFiles(MDS_DIR);
      const relativeFiles = files.map(f => f.replace(`${MDS_DIR}/`, ""));
      return new Response(JSON.stringify(relativeFiles), {
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
      const content = await Deno.readTextFile(`${MDS_DIR}/${fileName}`);
      const html = await marked.parse(content);
      return new Response(JSON.stringify({ html, title: fileName }), {
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
