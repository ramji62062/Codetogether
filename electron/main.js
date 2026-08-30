const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn: cpSpawn } = require("child_process");

// ── node-pty (optional, graceful fallback) ──
let nodePty = null;
try {
  nodePty = require("node-pty");
} catch {
  console.warn("[electron] node-pty not available, using child_process fallback");
}

// ── State ──
let mainWindow = null;
let serverProcess = null;
let serverPort = 3456;

/** @type {Map<string, { pty: any, proc: any, alive: boolean }>} */
const terminals = new Map();

// ── Get default shell ──
function getDefaultShell() {
  if (process.platform === "win32") return process.env.COMSPEC || "powershell.exe";
  const candidates = [process.env.SHELL, "/bin/bash", "/bin/zsh", "/bin/sh"].filter(Boolean);
  for (const sh of candidates) {
    try { if (fs.existsSync(sh)) return sh; } catch {}
  }
  return "/bin/sh";
}

// ── Start Next.js server ──
function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, "..", "server.js");
    if (!fs.existsSync(serverPath)) {
      console.log("[electron] server.js not found, using remote deployment");
      resolve(null);
      return;
    }

    serverProcess = cpSpawn("node", [serverPath], {
      cwd: path.join(__dirname, ".."),
      env: {
        ...process.env,
        PORT: String(serverPort),
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    serverProcess.stdout.on("data", (data) => {
      const msg = data.toString();
      console.log("[server]", msg.trim());
      if (msg.includes("Ready on") || msg.includes("ready on") || msg.includes("started")) {
        resolve(serverPort);
      }
    });

    serverProcess.stderr.on("data", (data) => {
      const msg = data.toString();
      console.error("[server]", msg.trim());
      if (msg.includes("Ready on") || msg.includes("ready on")) {
        resolve(serverPort);
      }
    });

    serverProcess.on("error", (err) => {
      console.error("[electron] server error:", err.message);
      resolve(null);
    });

    // Timeout fallback
    setTimeout(() => resolve(serverPort), 8000);
  });
}

// ── Create main window ──
const REMOTE_URL = "https://codabase.onrender.com";

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "CodeTogether",
    icon: path.join(__dirname, "..", "public", "logo.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 12, y: 12 },
  });

  // If local server started, use it. Otherwise load remote deployment.
  const url = port ? `http://localhost:${port}` : REMOTE_URL;
  console.log("[electron] Loading:", url);

  mainWindow.loadURL(url).catch((err) => {
    console.error("[electron] Failed to load:", err.message);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL("data:text/html," + encodeURIComponent(`
        <html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0d1117;color:#c9d1d9;">
        <div style="text-align:center;max-width:500px;">
          <h1 style="font-size:24px;">CodeTogether</h1>
          <p style="color:#8b949e;">Could not connect to the server.</p>
          <p style="color:#8b949e;font-size:14px;">Please check your internet connection and try again.</p>
          <button onclick="location.href='${REMOTE_URL}'" style="margin-top:16px;padding:10px 24px;background:#238636;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;">Retry</button>
        </div></body></html>
      `));
    }
  });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── IPC: Terminal Operations ──
ipcMain.handle("terminal:create", (event, { id, cols, rows, cwd }) => {
  const shellPath = getDefaultShell();
  const workDir = cwd || os.homedir();
  const env = { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor", FORCE_COLOR: "1" };

  let child;
  if (nodePty) {
    child = nodePty.spawn(shellPath, [], {
      name: "xterm-256color",
      cols: cols || 80,
      rows: rows || 24,
      cwd: workDir,
      env,
    });
  } else {
    const args = process.platform === "win32" ? [] : ["-i"];
    const proc = cpSpawn(shellPath, args, {
      cwd: workDir,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    child = {
      onData: (cb) => {
        proc.stdout.on("data", (d) => cb(d.toString()));
        proc.stderr.on("data", (d) => cb(d.toString()));
      },
      onExit: (cb) => proc.on("close", (code) => cb({ exitCode: code ?? 0 })),
      write: (data) => { if (proc.stdin && !proc.stdin.destroyed) proc.stdin.write(data); },
      resize: () => {},
      kill: () => { try { proc.kill("SIGTERM"); } catch {} },
      pid: proc.pid,
    };
  }

  const session = { id, pty: child, alive: true };
  terminals.set(id, session);

  child.onData((data) => {
    if (!session.alive) return;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("terminal:output", { id, data });
    }
  });

  child.onExit(({ exitCode }) => {
    session.alive = false;
    terminals.delete(id);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("terminal:exit", { id, exitCode: exitCode ?? -1 });
    }
  });

  return { ok: true, pid: child.pid, shell: shellPath };
});

ipcMain.handle("terminal:write", (event, { id, data }) => {
  const session = terminals.get(id);
  if (session && session.alive) {
    session.pty.write(data);
    return true;
  }
  return false;
});

ipcMain.handle("terminal:resize", (event, { id, cols, rows }) => {
  const session = terminals.get(id);
  if (session && session.alive) {
    try { session.pty.resize(cols, rows); } catch {}
    return true;
  }
  return false;
});

ipcMain.handle("terminal:kill", (event, { id }) => {
  const session = terminals.get(id);
  if (session) {
    try { session.pty.kill(); } catch {}
    session.alive = false;
    terminals.delete(id);
    return true;
  }
  return false;
});

// ── IPC: File System Operations ──
ipcMain.handle("fs:read", (event, { filePath }) => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const stat = fs.statSync(filePath);
    return { content, mtimeMs: stat.mtimeMs, size: stat.size };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle("fs:write", (event, { filePath, content }) => {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content || "", "utf8");
    const stat = fs.statSync(filePath);
    return { ok: true, mtimeMs: stat.mtimeMs, size: stat.size };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle("fs:list", (event, { dirPath }) => {
  const IGNORE_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", ".DS_Store"]);
  const MAX_FILE_SIZE = 2 * 1024 * 1024;
  const out = [];

  function walk(dir, rel = "") {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const nextRel = rel ? `${rel}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        out.push({ name: nextRel, path: nextRel, content: "", language: "folder", isFolder: true });
        walk(full, nextRel);
      } else if (entry.isFile()) {
        try {
          const st = fs.statSync(full);
          if (st.size > MAX_FILE_SIZE) {
            out.push({ name: nextRel, path: nextRel, content: `// [File too large]`, language: getLang(nextRel), size: st.size });
            continue;
          }
          out.push({ name: nextRel, path: nextRel, content: fs.readFileSync(full, "utf8"), language: getLang(nextRel), size: st.size });
        } catch {}
      }
    }
  }

  walk(dirPath);
  return out;
});

ipcMain.handle("fs:delete", (event, { filePath }) => {
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) fs.rmSync(filePath, { recursive: true, force: true });
    else fs.unlinkSync(filePath);
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle("fs:mkdir", (event, { dirPath }) => {
  try { fs.mkdirSync(dirPath, { recursive: true }); return { ok: true }; }
  catch (err) { return { error: err.message }; }
});

// ── IPC: Dialog (Open Folder) ──
ipcMain.handle("dialog:openFolder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Open Project Folder",
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

// ── IPC: App Info ──
ipcMain.handle("app:info", () => ({
  platform: process.platform,
  arch: process.arch,
  homedir: os.homedir(),
  shell: getDefaultShell(),
  version: app.getVersion(),
}));

// ── Helpers ──
function getLang(filePath) {
  const ext = (filePath.split(".").pop() || "").toLowerCase();
  const map = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", java: "java", cpp: "cpp", c: "c", go: "go", rs: "rust",
    rb: "ruby", php: "php", sh: "shell", html: "html", css: "css",
    json: "json", md: "markdown", yml: "yaml", yaml: "yaml",
  };
  return map[ext] || "plaintext";
}

// ── App Lifecycle ──
app.whenReady().then(async () => {
  let port = null;
  try {
    port = await startServer();
  } catch (err) {
    console.error("Failed to start server:", err);
  }
  createWindow(port);
});

app.on("window-all-closed", () => {
  // Kill all terminals
  for (const [id, session] of terminals) {
    try { session.pty.kill(); } catch {}
    session.alive = false;
  }
  terminals.clear();

  // Kill server if running
  if (serverProcess) {
    try { serverProcess.kill("SIGTERM"); } catch {}
    serverProcess = null;
  }

  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow(null);
});

app.on("before-quit", () => {
  if (serverProcess) {
    try { serverProcess.kill("SIGTERM"); } catch {}
    serverProcess = null;
  }
});
