"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  FolderOpen, File, Folder, FolderOpen as FolderOpenIcon, ChevronDown, ChevronRight,
  FilePlus, FolderPlus, Trash2, Play, Square, Terminal as TerminalIcon,
  Settings, Search, GitBranch, Bug, Puzzle, X, Plus, RotateCw, Save,
  ChevronUp, MoreHorizontal, Maximize2, Minus, Copy, Edit,
} from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ── Types ──
type FileNode = {
  name: string;
  path: string;
  isFolder: boolean;
  children?: FileNode[];
  content?: string;
  language?: string;
  size?: number;
};

type OpenFile = {
  path: string;
  name: string;
  content: string;
  dirty: boolean;
  language: string;
};

type TerminalTab = {
  id: string;
  title: string;
  ptyId: string;
  cwd: string;
};

// ── Helpers ──
function getLang(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", java: "java", cpp: "cpp", c: "c", go: "go", rs: "rust",
    rb: "ruby", php: "php", sh: "shell", html: "html", css: "css",
    json: "json", md: "markdown", yml: "yaml", yaml: "yaml",
    txt: "plaintext", xml: "html", sql: "sql", dockerfile: "shell",
  };
  if (path.toLowerCase().includes("dockerfile")) return "shell";
  return map[ext] || "plaintext";
}

function getIcon(name: string, isFolder: boolean): string {
  if (isFolder) return "";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const icons: Record<string, string> = {
    js: "JS", jsx: "JSX", ts: "TS", tsx: "TSX",
    py: "PY", java: "JV", cpp: "C++", c: "C",
    go: "GO", rs: "RS", html: "<>", css: "#",
    json: "{}", md: "MD", sh: "$",
  };
  return icons[ext] || "";
}

function sortByType(a: FileNode, b: FileNode): number {
  if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
  return a.name.localeCompare(b.name);
}

// ── Main Component ──
export default function LocalIDEPage() {
  const api = typeof window !== "undefined" ? (window as any).electronAPI : null;

  // State
  const [folderPath, setFolderPath] = useState<string>("");
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFile, setActiveFile] = useState<string>("");
  const [terminals, setTerminals] = useState<TerminalTab[]>([]);
  const [activeTerminal, setActiveTerminal] = useState<string>("");
  const [terminalHeight, setTerminalHeight] = useState(220);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [sidebarSection, setSidebarSection] = useState<"explorer" | "search" | "git">("explorer");
  const [appInfo, setAppInfo] = useState<any>(null);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [runOutput, setRunOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);

  // Refs
  const termRef = useRef<Map<string, { term: XTerm; fit: FitAddon; ptyId: string }>>(new Map());
  const termContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const runProcessRef = useRef<string | null>(null);

  // ── Load app info ──
  useEffect(() => {
    if (api) {
      api.app.info().then(setAppInfo);
    }
  }, [api]);

  // ── File tree loading ──
  const loadFolder = useCallback(async (dirPath: string) => {
    if (!api) return;
    const items = await api.fs.list(dirPath);
    if (!items || items.error) return;

    const buildTree = (items: any[]): FileNode[] => {
      const map = new Map<string, FileNode>();
      const roots: FileNode[] = [];

      // Create all nodes first
      for (const item of items) {
        const node: FileNode = {
          name: item.name.split("/").pop() || item.name,
          path: item.path,
          isFolder: Boolean(item.isFolder),
          content: item.content,
          language: item.language,
          size: item.size,
        };
        map.set(item.path, node);
      }

      // Build hierarchy
      for (const item of items) {
        const node = map.get(item.path)!;
        const parts = item.path.split("/");
        parts.pop();
        const parentPath = parts.join("/");

        if (parentPath && map.has(parentPath)) {
          const parent = map.get(parentPath)!;
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }

      // Sort children
      const sortChildren = (nodes: FileNode[]) => {
        nodes.sort(sortByType);
        nodes.forEach((n) => { if (n.children) sortChildren(n.children); });
      };
      sortChildren(roots);

      return roots;
    };

    setFileTree(buildTree(items));
  }, [api]);

  // ── Open folder dialog ──
  const handleOpenFolder = useCallback(async () => {
    if (!api) return;
    const selected = await api.dialog.openFolder();
    if (selected) {
      setFolderPath(selected);
      setExpandedFolders(new Set([selected]));
      await loadFolder(selected);
    }
  }, [api, loadFolder]);

  // ── Open file ──
  const openFile = useCallback(async (filePath: string) => {
    if (!api) return;
    const existing = openFiles.find((f) => f.path === filePath);
    if (existing) {
      setActiveFile(filePath);
      return;
    }

    const result = await api.fs.read(filePath);
    if (result.error) return;

    const name = filePath.split("/").pop() || filePath;
    setOpenFiles((prev) => [
      ...prev,
      {
        path: filePath,
        name,
        content: result.content || "",
        dirty: false,
        language: getLang(filePath),
      },
    ]);
    setActiveFile(filePath);
  }, [api, openFiles]);

  // ── Save file ──
  const saveFile = useCallback(async (filePath: string) => {
    if (!api) return;
    const file = openFiles.find((f) => f.path === filePath);
    if (!file) return;
    await api.fs.write(filePath, file.content);
    setOpenFiles((prev) => prev.map((f) => f.path === filePath ? { ...f, dirty: false } : f));
  }, [api, openFiles]);

  // ── Close file ──
  const closeFile = useCallback((filePath: string) => {
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.path !== filePath);
      if (activeFile === filePath) {
        const idx = prev.findIndex((f) => f.path === filePath);
        const newActive = next[Math.min(idx, next.length - 1)]?.path || "";
        setActiveFile(newActive);
      }
      return next;
    });
  }, [activeFile]);

  // ── Update file content ──
  const updateContent = useCallback((filePath: string, content: string) => {
    setOpenFiles((prev) => prev.map((f) => f.path === filePath ? { ...f, content, dirty: true } : f));
  }, []);

  // ── Terminal ──
  const createTerminal = useCallback(async (cwd?: string) => {
    if (!api) return;
    const id = `term-${Date.now()}`;
    const termCwd = cwd || folderPath || (appInfo?.homedir) || "/";

    const result = await api.terminal.create({ id, cols: 120, rows: 30, cwd: termCwd });
    if (!result.ok) return;

    const term = new XTerm({
      theme: {
        background: "#0a0a0a",
        foreground: "#e0e0e0",
        cursor: "#ffffff",
        cursorAccent: "#000000",
        selectionBackground: "rgba(255,255,255,0.2)",
        black: "#000000",
        red: "#cd3131",
        green: "#0dbc79",
        yellow: "#e5e510",
        blue: "#2472c8",
        magenta: "#bc3fbc",
        cyan: "#11a8cd",
        white: "#e5e5e5",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#e5e5e5",
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);

    const tab: TerminalTab = { id, title: `Terminal ${terminals.length + 1}`, ptyId: id, cwd: termCwd };
    setTerminals((prev) => [...prev, tab]);
    setActiveTerminal(id);

    // We'll attach after render
    termRef.current.set(id, { term, fit, ptyId: id });

    // Listen for output
    const unsubOutput = api.terminal.onOutput((outId: string, data: string) => {
      if (outId === id) {
        const t = termRef.current.get(id);
        if (t) t.term.write(data);
      }
    });

    const unsubExit = api.terminal.onExit((outId: string) => {
      if (outId === id) {
        termRef.current.get(id)?.term.dispose();
        termRef.current.delete(id);
        setTerminals((prev) => prev.filter((t) => t.id !== id));
        if (activeTerminal === id) {
          setActiveTerminal((prev) => {
            const remaining = Array.from(termRef.current.keys());
            return remaining[0] || "";
          });
        }
      }
    });

    return () => { unsubOutput(); unsubExit(); };
  }, [api, folderPath, appInfo, terminals.length, activeTerminal]);

  // ── Attach terminal to DOM ──
  useEffect(() => {
    if (!activeTerminal || !termContainerRef.current) return;
    const entry = termRef.current.get(activeTerminal);
    if (!entry) return;

    const container = termContainerRef.current;
    container.innerHTML = "";
    entry.term.open(container);
    try { entry.fit.fit(); } catch {}

    const observer = new ResizeObserver(() => {
      try { entry.fit.fit(); } catch {}
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [activeTerminal, terminals.length, terminalHeight]);

  // ── Kill terminal ──
  const killTerminal = useCallback(async (id: string) => {
    if (!api) return;
    await api.terminal.kill(id);
    termRef.current.get(id)?.term.dispose();
    termRef.current.delete(id);
    setTerminals((prev) => prev.filter((t) => t.id !== id));
    if (activeTerminal === id) {
      setActiveTerminal((prev) => {
        const remaining = Array.from(termRef.current.keys());
        return remaining[0] || "";
      });
    }
  }, [api, activeTerminal]);

  // ── Run code ──
  const runCode = useCallback(async () => {
    if (!api || !activeFile) return;
    const file = openFiles.find((f) => f.path === activeFile);
    if (!file) return;

    const ext = file.path.split(".").pop()?.toLowerCase() || "";
    let cmd = "";

    switch (ext) {
      case "js": cmd = `node "${file.path}"`; break;
      case "py": cmd = `python3 "${file.path}"`; break;
      case "java":
        cmd = `javac "${file.path}" && java -cp "$(dirname '${file.path}')" "${file.name.replace('.java', '')}"`;
        break;
      case "go": cmd = `go run "${file.path}"`; break;
      case "rs": cmd = `rustc "${file.path}" -o /tmp/ct_run && /tmp/ct_run`; break;
      case "rb": cmd = `ruby "${file.path}"`; break;
      case "sh": cmd = `bash "${file.path}"`; break;
      case "c":
        cmd = `gcc "${file.path}" -o /tmp/ct_run && /tmp/ct_run`;
        break;
      case "cpp":
        cmd = `g++ "${file.path}" -o /tmp/ct_run && /tmp/ct_run`;
        break;
      default:
        setRunOutput(`Cannot run .${ext} files`);
        return;
    }

    setIsRunning(true);
    setRunOutput(`$ ${cmd}\n`);

    // Create a run terminal
    const id = `run-${Date.now()}`;
    const cwd = folderPath || appInfo?.homedir || "/";

    const result = await api.terminal.create({ id, cols: 120, rows: 30, cwd });
    if (!result.ok) {
      setRunOutput((prev) => prev + "Failed to create run terminal\n");
      setIsRunning(false);
      return;
    }

    runProcessRef.current = id;

    const term = new XTerm({
      theme: {
        background: "#0a0a0a",
        foreground: "#e0e0e0",
        cursor: "#ffffff",
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
      fontSize: 13,
      scrollback: 10000,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);

    termRef.current.set(id, { term, fit, ptyId: id });
    setTerminals((prev) => [...prev, { id, title: file.name, ptyId: id, cwd }]);
    setActiveTerminal(id);

    const unsubOutput = api.terminal.onOutput((outId: string, data: string) => {
      if (outId === id) {
        termRef.current.get(id)?.term.write(data);
      }
    });

    const unsubExit = api.terminal.onExit((outId: string, code: number) => {
      if (outId === id) {
        setIsRunning(false);
        runProcessRef.current = null;
        termRef.current.get(id)?.term.dispose();
        termRef.current.delete(id);
        setTerminals((prev) => prev.filter((t) => t.id !== id));
        if (activeTerminal === id) {
          setActiveTerminal((prev) => {
            const remaining = Array.from(termRef.current.keys());
            return remaining[0] || "";
          });
        }
        unsubOutput();
        unsubExit();
      }
    });

    await api.terminal.write(id, cmd + "\n");
  }, [api, activeFile, openFiles, folderPath, appInfo, activeTerminal]);

  // ── Create new file/folder ──
  const [createMode, setCreateMode] = useState<{ type: "file" | "folder"; parentPath: string } | null>(null);
  const [createInput, setCreateInput] = useState("");

  const handleCreate = useCallback(async () => {
    if (!api || !createMode || !createInput.trim()) return;
    const name = createInput.trim();
    const fullPath = createMode.parentPath ? `${createMode.parentPath}/${name}` : name;

    if (createMode.type === "folder") {
      await api.fs.mkdir(fullPath);
    } else {
      await api.fs.write(fullPath, "");
    }
    setCreateMode(null);
    setCreateInput("");
    if (folderPath) await loadFolder(folderPath);
  }, [api, createMode, createInput, folderPath, loadFolder]);

  // ── Delete file/folder ──
  const handleDelete = useCallback(async (filePath: string) => {
    if (!api) return;
    await api.fs.delete(filePath);
    closeFile(filePath);
    if (folderPath) await loadFolder(folderPath);
  }, [api, folderPath, loadFolder, closeFile]);

  // ── Toggle folder ──
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (activeFile) saveFile(activeFile);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "w") {
        e.preventDefault();
        if (activeFile) closeFile(activeFile);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "`") {
        e.preventDefault();
        if (terminals.length === 0) createTerminal();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeFile, saveFile, closeFile, createTerminal, terminals.length]);

  // ── Terminal resize ──
  const handleTerminalResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingTerminal(true);
    const startY = e.clientY;
    const startH = terminalHeight;

    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      setTerminalHeight(Math.max(100, Math.min(600, startH + delta)));
    };
    const onUp = () => {
      setIsResizingTerminal(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      // Refit all terminals
      termRef.current.forEach((entry) => {
        try { entry.fit.fit(); } catch {}
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [terminalHeight]);

  // ── Sidebar resize ──
  const handleSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    const startX = e.clientX;
    const startW = sidebarWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      setSidebarWidth(Math.max(180, Math.min(500, startW + delta)));
    };
    const onUp = () => {
      setIsResizingSidebar(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [sidebarWidth]);

  // ── File tree render ──
  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isActive = node.path === activeFile;

    if (node.isFolder) {
      return (
        <div key={node.path}>
          <div
            onClick={() => toggleFolder(node.path)}
            onContextMenu={(e) => {
              e.preventDefault();
              // TODO: context menu
            }}
            className={`flex items-center h-[24px] cursor-pointer hover:bg-white/5 group ${
              isActive ? "bg-white/10" : ""
            }`}
            style={{ paddingLeft: depth * 14 + 8 }}
          >
            <span className="mr-1 text-gray-500">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            {isExpanded
              ? <FolderOpenIcon size={14} className="mr-1.5 text-yellow-400" />
              : <Folder size={14} className="mr-1.5 text-yellow-400" />
            }
            <span className="text-[13px] text-gray-200 truncate">{node.name}</span>
            <div className="ml-auto hidden group-hover:flex items-center gap-1 pr-1">
              <FilePlus size={12} className="text-gray-500 hover:text-white cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateMode({ type: "file", parentPath: node.path });
                  setCreateInput("");
                }}
              />
              <FolderPlus size={12} className="text-gray-500 hover:text-white cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateMode({ type: "folder", parentPath: node.path });
                  setCreateInput("");
                }}
              />
              <Trash2 size={12} className="text-gray-500 hover:text-red-400 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${node.name}"?`)) handleDelete(node.path);
                }}
              />
            </div>
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => renderFileNode(child, depth + 1))}
              {createMode?.parentPath === node.path && (
                <div className="flex items-center h-[24px]" style={{ paddingLeft: (depth + 1) * 14 + 8 + 16 }}>
                  {createMode.type === "folder"
                    ? <Folder size={14} className="mr-1.5 text-yellow-400" />
                    : <File size={14} className="mr-1.5 text-gray-400" />
                  }
                  <input
                    autoFocus
                    value={createInput}
                    onChange={(e) => setCreateInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                      if (e.key === "Escape") { setCreateMode(null); setCreateInput(""); }
                    }}
                    onBlur={handleCreate}
                    className="bg-black/40 border border-white/20 rounded px-1.5 py-0.5 text-white text-xs outline-none flex-1"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // File node
    const iconText = getIcon(node.name, false);
    return (
      <div
        key={node.path}
        onClick={() => openFile(node.path)}
        className={`flex items-center h-[24px] cursor-pointer hover:bg-white/5 group ${
          isActive ? "bg-white/10" : ""
        }`}
        style={{ paddingLeft: depth * 14 + 8 + 16 }}
      >
        {iconText ? (
          <span className="text-[10px] font-bold text-blue-400 w-[26px] mr-1 shrink-0">{iconText}</span>
        ) : (
          <File size={14} className="mr-1.5 text-gray-400" />
        )}
        <span className="text-[13px] text-gray-300 truncate">{node.name}</span>
        <div className="ml-auto hidden group-hover:flex items-center gap-1 pr-1">
          <Trash2 size={12} className="text-gray-500 hover:text-red-400 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${node.name}"?`)) handleDelete(node.path);
            }}
          />
        </div>
      </div>
    );
  };

  // ── No folder opened — Welcome screen ──
  if (!folderPath) {
    return (
      <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-white overflow-hidden select-none">
        {/* macOS title bar */}
        <div className="h-[38px] flex items-center bg-[#3c3c3c] border-b border-[#2b2b2b] px-4 shrink-0"
          style={{ WebkitAppRegion: "drag" } as any}>
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="flex-1 text-center text-[13px] text-gray-400 font-medium">CodeTogether</span>
        </div>

        {/* Welcome content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#007acc] flex items-center justify-center">
              <TerminalIcon size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">CodeTogether</h1>
            <p className="text-gray-400 mb-8">Local Development Environment</p>

            <button
              onClick={handleOpenFolder}
              className="px-8 py-3 bg-[#007acc] hover:bg-[#0098ff] text-white rounded-lg font-semibold text-lg transition-colors cursor-pointer"
            >
              <FolderOpen size={20} className="inline mr-2" />
              Open Folder
            </button>

            <div className="mt-10 text-left bg-[#252526] rounded-lg p-6 border border-[#3c3c3c]">
              <p className="text-gray-400 text-sm font-bold mb-3">Keyboard Shortcuts</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Save File</span>
                  <kbd className="bg-[#3c3c3c] px-2 py-0.5 rounded text-xs">Ctrl+S</kbd>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Close Tab</span>
                  <kbd className="bg-[#3c3c3c] px-2 py-0.5 rounded text-xs">Ctrl+W</kbd>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>New Terminal</span>
                  <kbd className="bg-[#3c3c3c] px-2 py-0.5 rounded text-xs">Ctrl+`</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="h-[22px] flex items-center bg-[#007acc] px-3 text-[11px] text-white shrink-0">
          <span>{appInfo?.platform} {appInfo?.arch}</span>
          <span className="ml-auto">v{appInfo?.version || "1.0.0"}</span>
        </div>
      </div>
    );
  }

  // ── Main IDE layout ──
  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-white overflow-hidden select-none">
      {/* macOS title bar */}
      <div className="h-[38px] flex items-center bg-[#3c3c3c] border-b border-[#2b2b2b] px-4 shrink-0"
        style={{ WebkitAppRegion: "drag" } as any}>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="flex-1 text-center text-[13px] text-gray-400 font-medium truncate">
          {folderPath.split("/").pop()} — CodeTogether
        </span>
        <div className="flex gap-2 items-center" style={{ WebkitAppRegion: "no-drag" } as any}>
          <button onClick={handleOpenFolder} className="text-gray-400 hover:text-white p-1 rounded">
            <FolderOpen size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Activity bar */}
        <div className="w-[48px] bg-[#333333] flex flex-col items-center py-2 gap-3 shrink-0">
          <button
            onClick={() => setSidebarSection("explorer")}
            className={`p-2 rounded ${sidebarSection === "explorer" ? "bg-white/10 border-l-2 border-white" : "text-gray-500 hover:text-white border-l-2 border-transparent"}`}
            title="Explorer"
          >
            <FolderOpen size={20} />
          </button>
          <button
            onClick={() => setSidebarSection("search")}
            className={`p-2 rounded ${sidebarSection === "search" ? "bg-white/10 border-l-2 border-white" : "text-gray-500 hover:text-white border-l-2 border-transparent"}`}
            title="Search"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => setSidebarSection("git")}
            className={`p-2 rounded ${sidebarSection === "git" ? "bg-white/10 border-l-2 border-white" : "text-gray-500 hover:text-white border-l-2 border-transparent"}`}
            title="Source Control"
          >
            <GitBranch size={20} />
          </button>
          <div className="flex-1" />
          <button className="p-2 text-gray-500 hover:text-white" title="Settings">
            <Settings size={20} />
          </button>
        </div>

        {/* Sidebar */}
        <div
          className="bg-[#252526] border-r border-[#2b2b2b] flex flex-col overflow-hidden shrink-0"
          style={{ width: sidebarWidth }}
        >
          {sidebarSection === "explorer" && (
            <>
              {/* Explorer header */}
              <div className="h-[35px] flex items-center px-4 text-[11px] font-bold uppercase text-gray-300 shrink-0">
                Explorer
              </div>

              {/* Project name */}
              <div className="px-2 py-1 text-[11px] font-bold text-white border-b border-[#2b2b2b] flex items-center justify-between">
                <span className="truncate">{folderPath.split("/").pop()}</span>
                <div className="flex gap-1.5">
                  <FilePlus size={13} className="text-gray-500 hover:text-white cursor-pointer"
                    onClick={() => { setCreateMode({ type: "file", parentPath: folderPath }); setCreateInput(""); }}
                  />
                  <FolderPlus size={13} className="text-gray-500 hover:text-white cursor-pointer"
                    onClick={() => { setCreateMode({ type: "folder", parentPath: folderPath }); setCreateInput(""); }}
                  />
                  <RotateCw size={13} className="text-gray-500 hover:text-white cursor-pointer"
                    onClick={() => loadFolder(folderPath)}
                  />
                </div>
              </div>

              {/* File tree */}
              <div className="flex-1 overflow-y-auto py-1">
                {fileTree.map((node) => renderFileNode(node, 0))}
                {createMode?.parentPath === folderPath && (
                  <div className="flex items-center h-[24px] px-4">
                    {createMode.type === "folder"
                      ? <Folder size={14} className="mr-1.5 text-yellow-400" />
                      : <File size={14} className="mr-1.5 text-gray-400" />
                    }
                    <input
                      autoFocus
                      value={createInput}
                      onChange={(e) => setCreateInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreate();
                        if (e.key === "Escape") { setCreateMode(null); setCreateInput(""); }
                      }}
                      onBlur={handleCreate}
                      className="bg-black/40 border border-white/20 rounded px-1.5 py-0.5 text-white text-xs outline-none flex-1"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {sidebarSection === "search" && (
            <div className="flex-1 flex flex-col">
              <div className="h-[35px] flex items-center px-4 text-[11px] font-bold uppercase text-gray-300 shrink-0">
                Search
              </div>
              <div className="px-3 py-2">
                <input
                  type="text"
                  placeholder="Search files..."
                  className="w-full bg-[#3c3c3c] border border-[#555] rounded px-2 py-1.5 text-sm text-white outline-none"
                />
              </div>
            </div>
          )}

          {sidebarSection === "git" && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <GitBranch size={32} className="mb-2" />
              <p className="text-sm">No Git repository</p>
            </div>
          )}
        </div>

        {/* Sidebar resize handle */}
        <div
          onMouseDown={handleSidebarResize}
          className={`w-[3px] bg-transparent hover:bg-[#007acc] cursor-col-resize shrink-0 ${isResizingSidebar ? "bg-[#007acc]" : ""}`}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor tabs */}
          {openFiles.length > 0 && (
            <div className="h-[35px] flex items-center bg-[#252526] border-b border-[#2b2b2b] overflow-x-auto shrink-0">
              {openFiles.map((file) => (
                <div
                  key={file.path}
                  onClick={() => setActiveFile(file.path)}
                  className={`flex items-center h-full px-3 gap-1.5 border-r border-[#2b2b2b] cursor-pointer min-w-0 ${
                    activeFile === file.path ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d2d] text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <span className="text-[10px] font-bold text-blue-400 shrink-0">{getIcon(file.name, false) || "•"}</span>
                  <span className="text-[12px] truncate">{file.name}</span>
                  {file.dirty && <span className="w-2 h-2 rounded-full bg-white shrink-0" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); closeFile(file.path); }}
                    className="ml-1 text-gray-500 hover:text-white shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Editor + Terminal */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Editor area */}
            <div className="flex-1 min-h-0">
              {activeFile ? (
                <MonacoEditor
                  key={activeFile}
                  language={openFiles.find((f) => f.path === activeFile)?.language || "plaintext"}
                  value={openFiles.find((f) => f.path === activeFile)?.content || ""}
                  theme="vs-dark"
                  onChange={(value) => updateContent(activeFile, value || "")}
                  onMount={(editor) => { editorRef.current = editor; }}
                  options={{
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                    lineHeight: 20,
                    minimap: { enabled: true, scale: 1 },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                    tabSize: 2,
                    renderWhitespace: "selection",
                    bracketPairColorization: { enabled: true },
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    smoothScrolling: true,
                    padding: { top: 8 },
                    suggest: { showWords: true },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-600">
                  <div className="text-center">
                    <p className="text-lg mb-2">No file open</p>
                    <p className="text-sm">Select a file from the explorer or open a folder</p>
                    <button
                      onClick={handleOpenFolder}
                      className="mt-4 px-4 py-2 bg-[#007acc] hover:bg-[#0098ff] text-white rounded text-sm transition-colors cursor-pointer"
                    >
                      Open Folder
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Terminal resize handle */}
            {terminals.length > 0 && (
              <div
                onMouseDown={handleTerminalResize}
                className={`h-[3px] bg-transparent hover:bg-[#007acc] cursor-row-resize shrink-0 ${isResizingTerminal ? "bg-[#007acc]" : ""}`}
              />
            )}

            {/* Terminal panel */}
            {terminals.length > 0 && (
              <div className="bg-[#1e1e1e] border-t border-[#2b2b2b] shrink-0" style={{ height: terminalHeight }}>
                {/* Terminal tabs */}
                <div className="h-[30px] flex items-center bg-[#252526] border-b border-[#2b2b2b] px-1">
                  {terminals.map((tab) => (
                    <div
                      key={tab.id}
                      onClick={() => setActiveTerminal(tab.id)}
                      className={`flex items-center h-full px-3 gap-1 cursor-pointer text-[12px] ${
                        activeTerminal === tab.id ? "bg-[#1e1e1e] text-white" : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      <TerminalIcon size={12} />
                      <span className="truncate max-w-[100px]">{tab.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); killTerminal(tab.id); }}
                        className="text-gray-500 hover:text-white"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => createTerminal()}
                    className="ml-1 text-gray-500 hover:text-white p-1"
                    title="New Terminal"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Terminal container */}
                <div
                  ref={termContainerRef}
                  className="p-1 overflow-hidden"
                  style={{ height: terminalHeight - 30 }}
                />
              </div>
            )}

            {/* Bottom bar when no terminal */}
            {terminals.length === 0 && (
              <div className="h-[30px] flex items-center bg-[#007acc] px-3 text-[11px] shrink-0">
                <button
                  onClick={() => createTerminal()}
                  className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded"
                >
                  <TerminalIcon size={12} /> New Terminal
                </button>
                <span className="ml-3 text-white/70">{folderPath}</span>
                <span className="ml-auto flex items-center gap-3">
                  <button
                    onClick={runCode}
                    disabled={!activeFile || isRunning}
                    className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded disabled:opacity-50"
                  >
                    {isRunning ? <Square size={12} /> : <Play size={12} />}
                    {isRunning ? "Running..." : "Run"}
                  </button>
                  <span>{appInfo?.platform} {appInfo?.arch}</span>
                  <span>v{appInfo?.version || "1.0.0"}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
