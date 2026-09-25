import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, statSync, readdirSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join, normalize, sep } from "path";

export const dynamic = "force-dynamic";

const WORKSPACE_ROOT = join(process.cwd(), "temp_workspaces");

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  wasm: "application/wasm",
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function mimeFor(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  return MIME[ext] || "application/octet-stream";
}

function sanitize(rel: string): string | null {
  const clean = normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^[\\/]+/, "");
  if (clean.includes("..")) return null;
  return clean.replace(/\\/g, "/");
}

function notFound(message: string, status = 404) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:-apple-system,Segoe UI,sans-serif;display:flex;align-items:center;justify-content:center;min-height:90vh;margin:0;background:#0f1117;color:#e2e8f0}
      .box{max-width:520px;padding:36px;border:1px solid #2a2f3d;border-radius:14px;background:#151926;text-align:center}
      h1{font-size:18px;margin:0 0 10px}p{font-size:13px;color:#94a3b8;line-height:1.6;margin:6px 0}
      code{background:#0d1017;padding:2px 7px;border-radius:5px;color:#7dd3fc;font-size:12px}
    </style></head><body><div class="box"><h1>🔎 ${message}</h1>
    <p>Create an <code>index.html</code> in your workspace, or pick a different file / folder in the preview toolbar.</p>
    <p>To preview a React / Vue / Vite app, run <code>npm run dev -- --host</code> in the terminal — the live server preview opens automatically.</p>
    </div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

function renderLiveWorkspacePage(roomId: string): Response {
  const base = join(WORKSPACE_ROOT, roomId);
  let jsCode = "";
  let jsFileName = "main.js";

  try {
    if (existsSync(base)) {
      const files = readdirSync(base);
      const targetJs = files.find(f => f === "main.js" || f === "index.js" || f.endsWith(".js"));
      if (targetJs) {
        jsFileName = targetJs;
        jsCode = readFileSync(join(base, targetJs), "utf8");
      }
    }
  } catch {}

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CodeTogether Live Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f1117; color: #e2e8f0; display: flex; flex-direction: column; min-height: 100vh; }
    header { background: #161922; border-bottom: 1px solid #232734; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; color: #fff; }
    .status-badge { display: flex; align-items: center; gap: 6px; font-size: 12px; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 3px 10px; border-radius: 9999px; }
    .pulse { width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
    main { flex: 1; padding: 24px; max-width: 900px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 16px; }
    .card { background: #161924; border: 1px solid #232838; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    .card-header { background: #1a1e2b; padding: 10px 16px; border-bottom: 1px solid #232838; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #94a3b8; font-family: monospace; }
    .console-body { background: #0a0c10; padding: 16px; min-height: 220px; font-family: "Menlo", "Monaco", "Courier New", monospace; font-size: 13px; line-height: 1.6; color: #f1f5f9; overflow-y: auto; }
    .log-line { border-bottom: 1px solid rgba(255,255,255,0.04); padding: 4px 0; word-break: break-all; }
    .log-err { color: #f87171; }
    .log-warn { color: #fbbf24; }
    .log-info { color: #60a5fa; }
    .hint-box { background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 10px; padding: 16px; font-size: 13px; color: #cbd5e1; }
    .hint-box code { background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; color: #93c5fd; font-family: monospace; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>● CodeTogether Live Preview</span>
      <span style="color:#64748b;font-weight:400">|</span>
      <span style="color:#94a3b8;font-size:13px">${jsFileName}</span>
    </div>
    <div class="status-badge">
      <div class="pulse"></div>
      <span>Live Sync Active</span>
    </div>
  </header>
  <main>
    <div class="card">
      <div class="card-header">
        <span>LIVE OUTPUT CONSOLE</span>
        <span id="run-time">Executing...</span>
      </div>
      <div class="console-body" id="console"></div>
    </div>
    <div class="hint-box">
      <strong>💡 Tip for Full-Stack & Web Apps:</strong> When you start a server (e.g. <code>npm run dev</code> or <code>python -m http.server</code>) in your terminal, CodeTogether automatically detects the port and switches Go Live directly to your running app!
    </div>
  </main>

  <script>
    const consoleEl = document.getElementById("console");
    function appendLog(text, type = "log") {
      const line = document.createElement("div");
      line.className = "log-line " + (type === "error" ? "log-err" : type === "warn" ? "log-warn" : "log-info");
      line.textContent = typeof text === "object" ? JSON.stringify(text, null, 2) : String(text);
      consoleEl.appendChild(line);
    }

    const origLog = console.log;
    const origErr = console.error;
    const origWarn = console.warn;
    console.log = function(...args) { origLog.apply(console, args); args.forEach(a => appendLog(a, "log")); };
    console.error = function(...args) { origErr.apply(console, args); args.forEach(a => appendLog(a, "error")); };
    console.warn = function(...args) { origWarn.apply(console, args); args.forEach(a => appendLog(a, "warn")); };

    try {
      const startTime = performance.now();
      ${jsCode}
      const dur = (performance.now() - startTime).toFixed(1);
      document.getElementById("run-time").textContent = "Completed in " + dur + "ms";
      if (!consoleEl.children.length) {
        appendLog("[Process finished with exit code 0 (no output)]", "info");
      }
    } catch (err) {
      appendLog("Runtime Error: " + (err && err.message ? err.message : String(err)), "error");
    }

    // Live Reload Script
    (function() {
      let lastMtime = 0;
      async function checkLiveUpdate() {
        try {
          const res = await fetch('/api/workspace/${roomId}/__live_ping?t=' + Date.now(), { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (lastMtime && data.mtime > lastMtime) {
              window.location.reload();
              return;
            }
            lastMtime = data.mtime;
          }
        } catch {}
        setTimeout(checkLiveUpdate, 800);
      }
      setTimeout(checkLiveUpdate, 800);
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

async function fromDatabase(roomId: string, relPath: string): Promise<Buffer | null> {
  try {
    const { data } = await supabase
      .from("rooms")
      .select("files_json")
      .eq("id", roomId)
      .maybeSingle();
    const files: any[] = Array.isArray(data?.files_json) ? data!.files_json : [];
    const wanted = relPath.replace(/\/+$/, "");
    const hit = files.find((f) => !f.isFolder && String(f.path || f.name || "").replace(/\\/g, "/") === wanted);
    if (hit && typeof hit.content === "string") {
      if (hit.content.startsWith("data:") && hit.content.includes(";base64,")) {
        const base64Data = hit.content.split(";base64,").pop()!;
        return Buffer.from(base64Data, "base64");
      }
      return Buffer.from(hit.content, "utf8");
    }
  } catch {}
  return null;
}

function fromDisk(roomId: string, relPath: string): Buffer | null {
  const base = join(WORKSPACE_ROOT, roomId);
  const target = normalize(join(base, relPath));
  if (!target.startsWith(base + sep) && target !== base) return null;
  try {
    if (!existsSync(target)) return null;
    if (statSync(target).isDirectory()) return null;
    if (statSync(target).size > 8 * 1024 * 1024) return null;
    return readFileSync(target);
  } catch {
    return null;
  }
}

async function getLiveMtime(roomId: string): Promise<number> {
  const base = join(WORKSPACE_ROOT, roomId);
  try {
    if (existsSync(base)) {
      const stats = statSync(base);
      return stats.mtimeMs;
    }
  } catch {}
  try {
    const { data } = await supabase
      .from("rooms")
      .select("updated_at, files_json")
      .eq("id", roomId)
      .maybeSingle();
    if (data?.updated_at) return new Date(data.updated_at).getTime();
  } catch {}
  return Date.now();
}

async function serveFile(roomId: string, rawPath: string): Promise<Response> {
  if (rawPath === "__live_ping") {
    const mtime = await getLiveMtime(roomId);
    return new Response(JSON.stringify({ ok: true, mtime }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  if (rawPath === "__files") {
    const base = join(WORKSPACE_ROOT, roomId);
    const files: any[] = [];
    const scanDir = (dir: string, rel = "") => {
      try {
        if (!existsSync(dir)) return;
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === "node_modules" || entry.name === ".git" || entry.name.startsWith(".")) continue;
          const nextRel = rel ? `${rel}/${entry.name}` : entry.name;
          const full = join(dir, entry.name);
          if (entry.isDirectory()) {
            files.push({ name: nextRel, path: nextRel, content: "", language: "folder", isFolder: true });
            scanDir(full, nextRel);
          } else if (entry.isFile()) {
            const ext = entry.name.split(".").pop() || "";
            let lang = "plaintext";
            if (ext === "js" || ext === "jsx") lang = "javascript";
            if (ext === "ts" || ext === "tsx") lang = "typescript";
            if (ext === "css") lang = "css";
            if (ext === "html") lang = "html";
            if (ext === "json") lang = "json";
            if (ext === "py") lang = "python";
            const content = readFileSync(full, "utf8");
            files.push({ name: nextRel, path: nextRel, content, language: lang, isFolder: false });
          }
        }
      } catch {}
    }
    scanDir(base);
    return new Response(JSON.stringify({ ok: true, files }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const rel = sanitize(rawPath);
  if (rel === null) return notFound("Invalid path", 400);
  const path = rel === "" ? "index.html" : rel;

  // Directory request -> its index.html
  let candidate = path;
  const diskDirProbe = normalize(join(WORKSPACE_ROOT, roomId, candidate));
  try {
    if (existsSync(diskDirProbe) && statSync(diskDirProbe).isDirectory()) {
      candidate = `${candidate}/index.html`;
    }
  } catch {}

  const buffer =
    (await fromDatabase(roomId, candidate)) ??
    fromDisk(roomId, candidate) ??
    (candidate !== path ? (await fromDatabase(roomId, path)) ?? fromDisk(roomId, path) : null);

  if (!buffer) {
    if (path === "index.html" || path === "") {
      const base = join(WORKSPACE_ROOT, roomId);
      try {
        if (existsSync(base)) {
          const files = readdirSync(base);
          const altHtml = files.find(f => f.endsWith(".html") || f.endsWith(".htm"));
          if (altHtml) {
            return serveFile(roomId, altHtml);
          }
        }
      } catch {}
      return renderLiveWorkspacePage(roomId);
    }
    return notFound(`Not found: ${path}`);
  }

  const mime = mimeFor(candidate);
  if (mime.startsWith("text/html")) {
    const htmlText = buffer.toString("utf8");
    const reloadScript = `
<!-- CodeTogether Live Server (Live Reload Extension) -->
<script>
(function() {
  let lastMtime = 0;
  let failCount = 0;
  async function checkLiveUpdate() {
    try {
      const res = await fetch('/api/workspace/${roomId}/__live_ping?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (lastMtime && data.mtime > lastMtime) {
          console.log('[Live Server] Workspace files changed. Reloading page...');
          window.location.reload();
          return;
        }
        lastMtime = data.mtime;
        failCount = 0;
      }
    } catch (e) {
      failCount++;
    }
    setTimeout(checkLiveUpdate, failCount > 5 ? 2000 : 600);
  }
  setTimeout(checkLiveUpdate, 600);
})();
</script>
`;
    let modifiedHtml = htmlText;
    if (modifiedHtml.includes("</body>")) {
      modifiedHtml = modifiedHtml.replace("</body>", `${reloadScript}</body>`);
    } else if (modifiedHtml.includes("</html>")) {
      modifiedHtml = modifiedHtml.replace("</html>", `${reloadScript}</html>`);
    } else {
      modifiedHtml += reloadScript;
    }
    return new Response(modifiedHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: { "Content-Type": mime, "Cache-Control": "no-store" },
  });
}

type Ctx = { params: { roomId: string; path?: string[] } };

export async function GET(_req: Request, ctx: Ctx) {
  const { roomId, path } = ctx.params;
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(roomId || "")) return notFound("Invalid room", 400);
  const rel = (path || []).map((s) => decodeURIComponent(s)).join("/");

  // 1. If an active server is running on a port for this room, redirect directly to that port!
  const activeServer = (global as any).__activeRoomServers?.get(roomId);
  if (activeServer && activeServer.url) {
    const targetUrl = rel ? `${activeServer.url}/${rel}` : activeServer.url;
    return Response.redirect(targetUrl, 302);
  }

  return serveFile(roomId, rel);
}

export async function POST(req: Request, ctx: Ctx) {
  const { roomId, path } = ctx.params;
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(roomId || "")) return notFound("Invalid room", 400);
  const action = (path || [])[0];

  if (action === "__save") {
    try {
      const body = await req.json();
      const files = Array.isArray(body.files) ? body.files : [];
      const base = join(WORKSPACE_ROOT, roomId);
      mkdirSync(base, { recursive: true });

      for (const file of files) {
        const relPath = String(file.path || file.name || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        if (!relPath || relPath.includes("..")) continue;
        const target = join(base, relPath);
        if (file.isFolder || file.language === "folder") {
          try { mkdirSync(target, { recursive: true }); } catch {}
        } else {
          try {
            mkdirSync(normalize(join(target, "..")), { recursive: true });
            writeFileSync(target, String(file.content || ""), "utf8");
          } catch {}
        }
      }

      // Also persist to Supabase rooms table
      try {
        await supabase
          .from("rooms")
          .update({ files_json: files, updated_at: new Date().toISOString() })
          .eq("id", roomId);
      } catch {}

      return new Response(JSON.stringify({ ok: true, count: files.length }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
    }
  }

  if (action === "__delete") {
    try {
      const body = await req.json().catch(() => ({}));
      const relPath = sanitize(String(body.path || ""));
      if (!relPath) return new Response(JSON.stringify({ ok: false, error: "Missing path" }), { status: 400 });

      const base = join(WORKSPACE_ROOT, roomId);
      const target = normalize(join(base, relPath));
      if (target.startsWith(base + sep) || target === base) {
        if (existsSync(target)) {
          rmSync(target, { recursive: true, force: true });
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
    }
  }

  return notFound("Unknown action", 404);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { roomId } = ctx.params;
  const url = new URL(req.url);
  const targetPath = url.searchParams.get("path") || "";
  const rel = sanitize(targetPath);
  if (!rel) return new Response(JSON.stringify({ ok: false, error: "Invalid path" }), { status: 400 });

  const base = join(WORKSPACE_ROOT, roomId);
  const target = normalize(join(base, rel));
  if (target.startsWith(base + sep) || target === base) {
    if (existsSync(target)) {
      try { rmSync(target, { recursive: true, force: true }); } catch {}
    }
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
