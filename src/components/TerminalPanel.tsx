"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebContainer } from "@webcontainer/api";
import "@xterm/xterm/css/xterm.css";
import {
  X, Play, Plus, Terminal as TerminalIcon, RefreshCw, Globe,
  Laptop, Check, Copy, RotateCcw, Home
} from "lucide-react";
import type { FileItem } from "@/components/FileExplorer";
import { supabase } from "@/lib/supabase";

let webcontainerPromise: Promise<WebContainer> | null = null;

type TerminalPanelProps = {
  onClose: () => void;
  roomId: string;
  roomName?: string;
  codeRef: React.MutableRefObject<string>;
  language: string;
  activeFileName: string;
  triggerRun?: number;
  onWorkSave?: () => void;
  files?: FileItem[];
  onFilesSync?: (files: FileItem[]) => void;
  onOutputLog?: (text: string) => void;
  onServerReady?: (url: string, port: number) => void;
  terminalAction?: any;
};

type TerminalTab = {
  id: string;
  title: string;
  terminalId: string;
  type?: "terminal" | "preview";
  mode?: "webcontainer" | "local";
};

type TabRuntime = {
  term: XTerm;
  fit: FitAddon;
  // WebContainer runner
  process: any;
  inputWriter: WritableStreamDefaultWriter | null;
  // Local companion runner
  ws: WebSocket | null;
  mode: "webcontainer" | "local";
  attached: boolean;
  workspacePath?: string;
  pendingCommand?: string | null;
  disposed?: boolean;
};

function cleanDisplayRoomName(name?: string): string {
  if (!name) return "Workspace";
  const trimmed = name.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed.title || parsed.name || "Workspace";
    } catch {
      return "Workspace";
    }
  }
  return trimmed || "Workspace";
}

function sanitizeTerminalOutput(data: string, roomId: string, cleanRoomName: string): string {
  if (!data) return "";
  let res = data;
  if (roomId) {
    res = res.replaceAll(roomId, cleanRoomName);
  }
  res = res.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, cleanRoomName);
  res = res.replaceAll(".codetogether/workspaces", cleanRoomName);
  res = res.replace(/(?:~|\/)[a-z0-9]{12,}[a-z0-9_-]*/gi, `~/${cleanRoomName}`);
  res = res.replace(/webcontainer\s*connected!?/gi, cleanRoomName);
  res = res.replace(/webcontainer/gi, cleanRoomName);
  return res;
}

function extractPortAndUrl(text: string): { url: string; port: number } | null {
  if (!text) return null;
  const clean = text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");

  // 1. Explicit http/https localhost or 127.0.0.1 or 0.0.0.0 URL
  const urlMatch = clean.match(/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})(?:\/[^\s]*)?/i);
  if (urlMatch) {
    const port = parseInt(urlMatch[1], 10);
    if (port && port !== 3000) {
      return { url: `http://localhost:${port}`, port };
    }
  }

  // 2. Framework formats (Local: http://...)
  const viteMatch = clean.match(/(?:Local|Network|App|Server):\s*(https?:\/\/[^\s]+)/i);
  if (viteMatch) {
    try {
      const u = new URL(viteMatch[1]);
      const port = parseInt(u.port, 10);
      if (port && port !== 3000) {
        return { url: `http://localhost:${port}`, port };
      }
    } catch {}
  }

  // 3. "port 5000", "listening on port: 8080", "port: 3001"
  const portMatch = clean.match(/(?:port|listening on|running at|server on)\s*[:=]?\s*(\d{4,5})/i);
  if (portMatch) {
    const port = parseInt(portMatch[1], 10);
    if (port && port !== 3000) {
      return { url: `http://localhost:${port}`, port };
    }
  }

  return null;
}

export default function TerminalPanel({
  onClose, roomId, roomName, codeRef, language, activeFileName,
  triggerRun = 0, files = [], onFilesSync, onOutputLog, onServerReady
}: TerminalPanelProps) {
  const cleanRoomName = cleanDisplayRoomName(roomName);
  const [height, setHeight] = useState(280);
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: "tab-1", title: "1: terminal", terminalId: `term_${roomId}_1`, mode: "local" }
  ]);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  const [isBooting, setIsBooting] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showLaptopModal, setShowLaptopModal] = useState(false);
  const [copiedOs, setCopiedOs] = useState<string | null>(null);
  const [activeOs, setActiveOs] = useState<"mac" | "win">("mac");
  
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const runtimesRef = useRef<Map<string, TabRuntime>>(new Map());
  const webcontainerRef = useRef<WebContainer | null>(null);

  const cleanRoomNameRef = useRef(cleanRoomName);
  cleanRoomNameRef.current = cleanRoomName;

  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;

  const filesRef = useRef(files);
  filesRef.current = files;

  const onOutputLogRef = useRef(onOutputLog);
  onOutputLogRef.current = onOutputLog;

  const onServerReadyRef = useRef(onServerReady);
  onServerReadyRef.current = onServerReady;

  const onFilesSyncRef = useRef(onFilesSync);
  onFilesSyncRef.current = onFilesSync;

  // Background WebContainer listener for dev server ready
  useEffect(() => {
    let mounted = true;
    async function listenServerReady() {
      if (typeof window === "undefined" || !window.crossOriginIsolated) return;
      try {
        if (!webcontainerPromise) webcontainerPromise = WebContainer.boot();
        const wc = await webcontainerPromise;
        if (!mounted) return;
        webcontainerRef.current = wc;
        wc.on("server-ready", (port, url) => {
          setPreviewUrl(url);
          if (onServerReadyRef.current) onServerReadyRef.current(url, port);
          setTabs(prev => {
            if (prev.find(t => t.type === "preview")) return prev;
            return [...prev, { id: "preview-tab", title: `Port ${port}`, terminalId: "preview", type: "preview" }];
          });
          setActiveTabId("preview-tab");
        });
      } catch {}
    }
    listenServerReady();
    return () => { mounted = false; };
  }, []);

  // Sync files to WebContainer when files change
  useEffect(() => {
    if (!webcontainerRef.current || files.length === 0) return;
    const tree: any = {};
    for (const f of files) {
      if (!f.isFolder && f.name) {
        const path = f.path || f.name;
        const parts = path.split("/");
        let current = tree;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = { directory: {} };
          current = current[parts[i]].directory;
        }
        current[parts[parts.length - 1]] = { file: { contents: f.content || "" } };
      }
    }
    webcontainerRef.current.mount(tree).catch(() => {});
  }, [files]);

  // Sync files between Terminal and Workspace
  const handleSyncFiles = async () => {
    setIsSyncing(true);

    const rt = runtimesRef.current.get(activeTabId);
    if (rt?.ws && rt.ws.readyState === WebSocket.OPEN) {
      try {
        rt.ws.send(JSON.stringify({
          type: "get-files",
          roomId: roomIdRef.current,
        }));
      } catch {}
    }

    // Safety timeout to prevent spinner from getting stuck
    setTimeout(() => {
      setIsSyncing(false);
    }, 2500);

    try {
      const res = await fetch(`/api/workspace/${roomIdRef.current}/__files?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.files) && data.files.length > 0 && onFilesSyncRef.current) {
          onFilesSyncRef.current(data.files);
        }
      }
    } catch {}

    if (webcontainerRef.current && onFilesSyncRef.current) {
      const readDirRecursively = async (dir: string, basePath: string): Promise<FileItem[]> => {
        let items: FileItem[] = [];
        try {
          const entries = await webcontainerRef.current!.fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name === "node_modules" || entry.name === ".git") continue;
            const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
              items.push({ name: entry.name, path: fullPath, isFolder: true, content: "", language: "folder" });
              const children = await readDirRecursively(`${dir}/${entry.name}`, fullPath);
              items = items.concat(children);
            } else {
              const content = await webcontainerRef.current!.fs.readFile(`${dir}/${entry.name}`, "utf8");
              const ext = entry.name.split(".").pop() || "";
              let lang = "plaintext";
              if (ext === "js" || ext === "jsx") lang = "javascript";
              if (ext === "ts" || ext === "tsx") lang = "typescript";
              if (ext === "css") lang = "css";
              if (ext === "html") lang = "html";
              if (ext === "json") lang = "json";
              if (ext === "py") lang = "python";
              items.push({ name: entry.name, path: fullPath, isFolder: false, content, language: lang });
            }
          }
        } catch {}
        return items;
      };

      try {
        const newFiles = await readDirRecursively(".", "");
        if (newFiles.length > 0) {
          onFilesSyncRef.current(newFiles);
          try {
            await fetch(`/api/workspace/${roomIdRef.current}/__save`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ files: newFiles }),
            });
          } catch {}
        }
      } catch {}
    }

    setTimeout(() => setIsSyncing(false), 500);
  };

  // Init Terminal tab with automatic reliable connection
  const initTerminal = useCallback(async (tabId: string, container: HTMLDivElement) => {
    if (runtimesRef.current.has(tabId) || tabId === "preview-tab") return;

    const term = new XTerm({
      theme: {
        background: "#0a0a0a",
        foreground: "#cccccc",
        cursor: "#ffffff",
        selectionBackground: "rgba(255,255,255,0.25)"
      },
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      fontSize: 13,
      cursorBlink: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    try { fit.fit(); } catch {}

    const rt: TabRuntime = {
      term,
      fit,
      process: null,
      inputWriter: null,
      ws: null,
      mode: "local",
      attached: false,
      pendingCommand: null,
    };
    runtimesRef.current.set(tabId, rt);

    term.onData((data) => {
      const currentRt = runtimesRef.current.get(tabId);
      if (!currentRt) return;
      if (currentRt.mode === "local" && currentRt.ws && currentRt.ws.readyState === WebSocket.OPEN) {
        currentRt.ws.send(JSON.stringify({ type: "input", roomId: roomIdRef.current, terminalId: tabId, data }));
      } else if (currentRt.mode === "webcontainer" && currentRt.inputWriter) {
        try { currentRt.inputWriter.write(data); } catch {}
      }
    });

    term.onResize((size) => {
      const currentRt = runtimesRef.current.get(tabId);
      if (!currentRt) return;
      if (currentRt.mode === "local" && currentRt.ws && currentRt.ws.readyState === WebSocket.OPEN) {
        currentRt.ws.send(JSON.stringify({ type: "resize", roomId: roomIdRef.current, terminalId: tabId, cols: size.cols, rows: size.rows }));
      } else if (currentRt.mode === "webcontainer" && currentRt.process) {
        try { currentRt.process.resize({ cols: size.cols, rows: size.rows }); } catch {}
      }
    });

    const ro = new ResizeObserver(() => {
      try { fit.fit(); } catch {}
    });
    ro.observe(container);

    let localSuccess = false;
    let isHandlingDisconnect = false;
    let heartbeatInterval: any = null;
    let reconnectTimer: any = null;
    let probeTimer: any = null;
    let hasBootedWebContainer = false;

    // Fallback: Boot WebContainer when local terminal is not connected
    const bootWebContainer = async () => {
      if (localSuccess || rt.disposed || hasBootedWebContainer) return;
      hasBootedWebContainer = true;
      rt.mode = "webcontainer";

      const canUseWebContainer = typeof window !== "undefined" && Boolean(window.crossOriginIsolated);
      if (canUseWebContainer) {
        try {
          if (!webcontainerRef.current) {
            const bootPromise = (async () => {
              if (!webcontainerPromise) webcontainerPromise = WebContainer.boot();
              return await webcontainerPromise;
            })();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("WebContainer boot timeout")), 5000)
            );
            webcontainerRef.current = await Promise.race([bootPromise, timeoutPromise]) as WebContainer;
          }

          // Mount current workspace files safely into WebContainer
          const tree: any = {};
          for (const f of filesRef.current) {
            if (!f.isFolder && f.name) {
              const path = f.path || f.name;
              const parts = path.split("/").filter(Boolean);
              let current = tree;
              for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) current[parts[i]] = { directory: {} };
                current = current[parts[i]].directory;
              }
              if (parts.length > 0) {
                current[parts[parts.length - 1]] = { file: { contents: f.content || "" } };
              }
            }
          }
          try { await webcontainerRef.current.mount(tree); } catch {}

          term.writeln(`\x1b[32m● ${cleanRoomNameRef.current}\x1b[0m\r\n`);

          const process = await webcontainerRef.current.spawn("jsh", {
            terminal: { cols: Math.max(term.cols || 80, 20), rows: Math.max(term.rows || 24, 5) }
          });
          rt.process = process;

          process.output.pipeTo(new WritableStream({
            write(data) {
              const sanitized = sanitizeTerminalOutput(data, roomIdRef.current, cleanRoomNameRef.current);
              term.write(sanitized);
              onOutputLogRef.current?.(sanitized);

              const detected = extractPortAndUrl(data);
              if (detected) {
                setPreviewUrl(detected.url);
                if (onServerReadyRef.current) {
                  onServerReadyRef.current(detected.url, detected.port);
                }
                setTabs(prev => {
                  if (prev.find(t => t.type === "preview")) {
                    return prev.map(t => t.type === "preview" ? { ...t, title: `Port ${detected.port}` } : t);
                  }
                  return [...prev, { id: "preview-tab", title: `Port ${detected.port}`, terminalId: "preview", type: "preview" }];
                });
              }
            }
          }));

          rt.inputWriter = process.input.getWriter();
          rt.attached = true;
          setIsBooting(false);

          if (rt.pendingCommand) {
            const cmd = rt.pendingCommand;
            rt.pendingCommand = null;
            try { rt.inputWriter.write(`\x15${cmd}\r`); } catch {}
          }
          setTimeout(() => {
            try {
              fit.fit();
              term.focus();
            } catch {}
          }, 40);

          // Background probe: if user connects laptop companion later, seamlessly upgrade to local mode
          if (!probeTimer) {
            probeTimer = setInterval(() => {
              if (rt.disposed || localSuccess) {
                clearInterval(probeTimer);
                return;
              }
              try {
                const probeProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
                const probeWs = new WebSocket(`${probeProtocol}//${window.location.host}/ws/terminal`);
                probeWs.onopen = () => {
                  probeWs.send(JSON.stringify({
                    type: "attach",
                    roomId: roomIdRef.current,
                    terminalId: tabId,
                    cols: term.cols || 80,
                    rows: term.rows || 24,
                    files: [],
                    isLocal: true,
                  }));
                };
                probeWs.onmessage = (ev) => {
                  try {
                    const data = JSON.parse(ev.data);
                    if ((data.type === "attached" && data.ok !== false) || data.type === "agent:connected") {
                      clearInterval(probeTimer);
                      probeWs.close();
                      try { rt.inputWriter?.close(); } catch {}
                      try { rt.process?.kill(); } catch {}
                      term.writeln(`\r\n\x1b[32m✔ Local companion connected! Switching to lifetime local terminal...\x1b[0m\r\n`);
                      localSuccess = true;
                      connectLocalWs();
                    }
                  } catch {}
                };
                setTimeout(() => {
                  try { probeWs.close(); } catch {}
                }, 3000);
              } catch {}
            }, 8000);
          }
          return;
        } catch (err: any) {
          console.warn("WebContainer activation note:", err?.message);
        }
      }

      // If WebContainer is not available without crossOriginIsolated, keep retrying local WS
      hasBootedWebContainer = false;
      rt.mode = "local";
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        if (!rt.disposed) connectLocalWs();
      }, 2000);
    };

    // Primary: Connect to Local Terminal WebSocket (lifetime reliable with auto-reconnect)
    const connectLocalWs = () => {
      if (rt.disposed) return;
      isHandlingDisconnect = false;
      try {
        if (rt.ws) {
          try { rt.ws.close(); } catch {}
          rt.ws = null;
        }
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/terminal`;
        const ws = new WebSocket(wsUrl);
        rt.ws = ws;

        // Auto-discover local companion daemon on 127.0.0.1:8765
        try {
          const probe = new WebSocket("ws://127.0.0.1:8765");
          probe.onopen = () => {
            probe.send(JSON.stringify({
              type: "connect-room",
              roomId: roomIdRef.current,
              server: window.location.origin
            }));
            setTimeout(() => { try { probe.close(); } catch {} }, 1000);
          };
          probe.onerror = () => {};
        } catch {}

        ws.onopen = () => {
          if (rt.disposed) {
            try { ws.close(); } catch {}
            return;
          }
          let token = "";
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.includes("-auth-token")) {
                token = JSON.parse(localStorage.getItem(k) || "{}")?.access_token || "";
                if (token) break;
              }
            }
          } catch {}

          const safeCols = Math.max(term.cols || 80, 20);
          const safeRows = Math.max(term.rows || 24, 5);

          ws.send(JSON.stringify({
            type: "attach",
            token,
            roomId: roomIdRef.current,
            terminalId: tabId,
            cols: safeCols,
            rows: safeRows,
            files: filesRef.current.map(f => ({ name: f.name || f.path, path: f.path || f.name, content: f.content || "" })),
            isLocal: true,
          }));

          // 15-second heartbeat ping to prevent reverse proxy/firewall idle disconnects
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: "heartbeat", roomId: roomIdRef.current }));
              } catch {}
            }
          }, 15000);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "output" && (msg.terminalId === tabId || !msg.terminalId)) {
              const sanitized = sanitizeTerminalOutput(msg.data, roomIdRef.current, cleanRoomNameRef.current);
              rt.term.write(sanitized);
              onOutputLogRef.current?.(sanitized);

              const detected = extractPortAndUrl(msg.data);
              if (detected) {
                setPreviewUrl(detected.url);
                if (onServerReadyRef.current) {
                  onServerReadyRef.current(detected.url, detected.port);
                }
                setTabs(prev => {
                  if (prev.find(t => t.type === "preview")) {
                    return prev.map(t => t.type === "preview" ? { ...t, title: `Port ${detected.port}` } : t);
                  }
                  return [...prev, { id: "preview-tab", title: `Port ${detected.port}`, terminalId: "preview", type: "preview" }];
                });
              }
            } else if (msg.type === "server-ready" && msg.port) {
              const url = msg.url || `http://localhost:${msg.port}`;
              setPreviewUrl(url);
              if (onServerReadyRef.current) {
                onServerReadyRef.current(url, msg.port);
              }
              setTabs(prev => {
                if (prev.find(t => t.type === "preview")) {
                  return prev.map(t => t.type === "preview" ? { ...t, title: `Port ${msg.port}` } : t);
                }
                return [...prev, { id: "preview-tab", title: `Port ${msg.port}`, terminalId: "preview", type: "preview" }];
              });
            } else if ((msg.type === "files-sync" || msg.type === "files:sync") && Array.isArray(msg.files)) {
              if (onFilesSyncRef.current && msg.files.length > 0) {
                onFilesSyncRef.current(msg.files);
              }
              setIsSyncing(false);
            } else if ((msg.type === "attached" && msg.ok !== false) || msg.type === "agent:connected") {
              localSuccess = true;
              if (probeTimer) clearInterval(probeTimer);
              rt.attached = true;
              rt.mode = "local";
              if (msg.workspace) rt.workspacePath = msg.workspace;
              setIsBooting(false);

              if (rt.pendingCommand) {
                const cmd = rt.pendingCommand;
                rt.pendingCommand = null;
                ws.send(JSON.stringify({ type: "input", roomId: roomIdRef.current, terminalId: tabId, data: `\x15${cmd}\r` }));
              }

              setTimeout(() => {
                try {
                  fit.fit();
                  term.focus();
                } catch {}
              }, 40);
            }
          } catch {
            if (typeof event.data === "string") rt.term.write(event.data);
          }
        };

        const handleDisconnect = () => {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          if (rt.disposed) return;
          if (isHandlingDisconnect) return;
          isHandlingDisconnect = true;

          if (localSuccess) {
            // LIFETIME PERSISTENCE: Reconnect automatically forever!
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
              if (!rt.disposed) {
                connectLocalWs();
              }
            }, 2000);
          } else {
            // Check if WebContainer can be booted
            const canUseWebContainer = typeof window !== "undefined" && Boolean(window.crossOriginIsolated);
            if (canUseWebContainer) {
              try { ws.close(); } catch {}
              rt.ws = null;
              bootWebContainer();
            } else {
              // Retry local connection
              if (reconnectTimer) clearTimeout(reconnectTimer);
              reconnectTimer = setTimeout(() => {
                if (!rt.disposed) {
                  connectLocalWs();
                }
              }, 2000);
            }
          }
        };

        ws.onerror = handleDisconnect;
        ws.onclose = handleDisconnect;
      } catch {
        if (!localSuccess) {
          bootWebContainer();
        }
      }
    };

    connectLocalWs();
  }, []);

  // Initialize uninitialized tabs strictly once
  useEffect(() => {
    tabs.forEach(tab => {
      if (tab.type === "preview") return;
      const el = containerRefs.current.get(tab.id);
      if (el && !runtimesRef.current.has(tab.id)) {
        initTerminal(tab.id, el);
      }
    });
  }, [tabs, initTerminal]);

  // Automatically fit and focus terminal when switching or adding tabs
  useEffect(() => {
    const rt = runtimesRef.current.get(activeTabId);
    if (rt) {
      const timer = setTimeout(() => {
        try {
          rt.fit.fit();
          rt.term.focus();
        } catch {}
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTabId, tabs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runtimesRef.current.forEach(rt => {
        rt.disposed = true;
        try { rt.inputWriter?.close(); } catch {}
        try { rt.process?.kill(); } catch {}
        try { rt.ws?.close(); } catch {}
        try { rt.term.dispose(); } catch {}
      });
      runtimesRef.current.clear();
    };
  }, []);

  // Run Code
  const isExecutingRef = useRef(false);
  const lastRunTimeRef = useRef(0);

  const executeRun = useCallback(async () => {
    const now = Date.now();
    // Strictly prevent multiple rapid executions within 1.2s
    if (isExecutingRef.current || (now - lastRunTimeRef.current < 1200)) {
      return;
    }
    isExecutingRef.current = true;
    lastRunTimeRef.current = now;
    setTimeout(() => {
      isExecutingRef.current = false;
    }, 1200);

    const rt = runtimesRef.current.get(activeTabId);
    if (!activeFileName) return;
    
    let cmd = "";
    if (language === "javascript" || activeFileName.endsWith(".js")) cmd = `node "${activeFileName}"`;
    else if (language === "python" || activeFileName.endsWith(".py")) cmd = `python3 "${activeFileName}"`;
    else if (language === "cpp" || activeFileName.endsWith(".cpp")) cmd = `g++ "${activeFileName}" && ./a.out`;
    else if (language === "java" || activeFileName.endsWith(".java")) cmd = `javac "${activeFileName}" && java "${activeFileName.replace(".java", "")}"`;
    else cmd = `./"${activeFileName}"`;

    const currentCode = codeRef.current || "";

    // 1. If Local companion / terminal WebSocket is active (or connecting):
    if (rt && rt.ws && (rt.ws.readyState === WebSocket.OPEN || rt.ws.readyState === WebSocket.CONNECTING)) {
      if (rt.ws.readyState === WebSocket.CONNECTING) {
        // Give connection a short moment to transition to OPEN
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 800);
          const socket = rt.ws;
          if (!socket) return resolve();
          const prevOpen = socket.onopen;
          socket.onopen = (ev) => {
            clearTimeout(timeout);
            try { prevOpen?.call(socket, ev); } catch {}
            resolve();
          };
        });
      }

      if (rt.ws && rt.ws.readyState === WebSocket.OPEN) {
        rt.mode = "local";
        rt.attached = true;
        rt.ws.send(JSON.stringify({
          type: "sync-workspace",
          roomId,
          files: filesRef.current.map(f => ({
            name: f.name || f.path,
            path: f.path || f.name,
            isFolder: Boolean(f.isFolder),
            content: (f.name === activeFileName || f.path === activeFileName) ? currentCode : (f.content || "")
          }))
        }));
        // Clear line with \x15 and execute command directly in the already active workspace
        rt.ws.send(JSON.stringify({ type: "input", roomId, terminalId: activeTabId, data: `\x15${cmd}\r` }));
        return;
      }
    }

    // 2. If WebContainer is active:
    if (rt && rt.mode === "webcontainer" && rt.inputWriter) {
      if (webcontainerRef.current) {
        try {
          const dir = activeFileName.includes("/") ? activeFileName.substring(0, activeFileName.lastIndexOf("/")) : "";
          if (dir) {
            await webcontainerRef.current.fs.mkdir(dir, { recursive: true }).catch(() => {});
          }
          await webcontainerRef.current.fs.writeFile(activeFileName, currentCode);
        } catch {}
      }
      try { rt.inputWriter.write(`\x15${cmd}\r`); } catch {}
      return;
    }

    // 3. Fallback: If not connected to local companion or WebContainer, EXECUTE THROUGH PISTON!
    if (rt) {
      rt.term.writeln(`\r\n\x1b[36m⚡ [Piston Engine] Executing ${language || "code"} (${activeFileName})...\x1b[0m\r\n`);
      try {
        const res = await fetch("/api/run-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: currentCode,
            language: language || "javascript",
            fileName: activeFileName,
            files: filesRef.current,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.compile?.stderr) {
            rt.term.write(`\x1b[31m${data.compile.stderr}\x1b[0m\r\n`);
          }
          if (data.stderr) {
            rt.term.write(`\x1b[31m${data.stderr}\x1b[0m\r\n`);
          }
          if (data.stdout) {
            rt.term.write(data.stdout.replace(/\n/g, "\r\n"));
          }
          rt.term.writeln(`\r\n\x1b[32m✔ Process exited with code ${data.exitCode ?? 0}\x1b[0m\r\n`);
        } else {
          rt.term.writeln(`\x1b[31mExecution failed with status ${res.status}\x1b[0m\r\n`);
        }
      } catch (err: any) {
        rt.term.writeln(`\x1b[31mExecution error: ${err.message}\x1b[0m\r\n`);
      }
    }
  }, [activeTabId, activeFileName, language, roomId, codeRef]);

  const executeRunRef = useRef(executeRun);
  executeRunRef.current = executeRun;

  // Single reliable execution of triggerRun
  const lastTriggerRunRef = useRef(triggerRun);
  useEffect(() => {
    if (triggerRun === 0 || triggerRun === lastTriggerRunRef.current) return;
    lastTriggerRunRef.current = triggerRun;
    executeRunRef.current();
  }, [triggerRun]);

  const restartTerminal = useCallback(() => {
    const rt = runtimesRef.current.get(activeTabId);
    if (!rt) return;
    if (rt.mode === "webcontainer" && rt.inputWriter) {
      try { rt.inputWriter.write("\x03\r\x15clear\r"); } catch {}
      rt.term.reset();
      return;
    }
    if (rt.mode === "local" && rt.ws && rt.ws.readyState === WebSocket.OPEN) {
      const cdCmd = rt.workspacePath ? `cd "${rt.workspacePath}" 2>/dev/null && ` : ``;
      try { rt.ws.send(JSON.stringify({ type: "input", roomId, terminalId: activeTabId, data: `\x03\r\x15${cdCmd}clear\x0c` })); } catch {}
      rt.term.reset();
    }
  }, [activeTabId, roomId]);

  const goToWorkspace = useCallback(() => {
    const rt = runtimesRef.current.get(activeTabId);
    if (!rt) return;
    if (rt.mode === "webcontainer" && rt.inputWriter) {
      try { rt.inputWriter.write("\x15cd .\r"); } catch {}
      return;
    }
    if (rt.mode === "local" && rt.ws && rt.ws.readyState === WebSocket.OPEN) {
      const cdCmd = rt.workspacePath ? `cd "${rt.workspacePath}"` : `cd .`;
      try { rt.ws.send(JSON.stringify({ type: "input", roomId, terminalId: activeTabId, data: `\x15${cdCmd}\r` })); } catch {}
    }
  }, [activeTabId, roomId]);

  const addTab = () => {
    const id = `tab-${Date.now()}`;
    setTabs(prev => [...prev, { id, title: `${prev.length + 1}: terminal`, terminalId: `term_${roomId}_${Date.now()}`, mode: "local" }]);
    setActiveTabId(id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === "preview-tab") {
      setPreviewUrl(null);
    }
    const rt = runtimesRef.current.get(id);
    if (rt) {
      rt.disposed = true;
      try { rt.inputWriter?.close(); } catch {}
      try { rt.process?.kill(); } catch {}
      try { rt.ws?.close(); } catch {}
      try { rt.term.dispose(); } catch {}
      runtimesRef.current.delete(id);
    }
    containerRefs.current.delete(id);
    const newTabs = tabs.filter(t => t.id !== id);
    if (newTabs.length === 0) onClose();
    else {
      setTabs(newTabs);
      if (activeTabId === id) setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  // Commands for connecting user's personal laptop
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const macInstallCmd = `curl -fsSL "${origin}/api/agent/install?os=mac&room=${roomId}" | bash`;
  const winInstallCmd = `irm "${origin}/api/agent/install?os=win&room=${roomId}" | iex`;

  const copyToClipboard = (text: string, os: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOs(os);
    setTimeout(() => setCopiedOs(null), 2000);
  };

  return (
    <div style={{ height: `${height}px` }} className="flex flex-col bg-[#1e1e1e] border-t border-[#333] select-none relative z-20">
      {/* Resize Handle */}
      <div 
        className="h-1 bg-transparent hover:bg-blue-500 cursor-row-resize absolute top-0 left-0 right-0 z-30 transition-colors"
        onPointerDown={(e) => {
          const startY = e.clientY;
          const startH = height;
          const onMove = (ev: PointerEvent) => {
            setHeight(Math.max(120, Math.min(window.innerHeight * 0.8, startH - (ev.clientY - startY))));
          };
          const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
          };
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
        }}
      />
      {/* Header */}
      <div className="flex items-center justify-between px-2 bg-[#1e1e1e] border-b border-[#333] h-[35px]">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map(t => (
            <div 
              key={t.id} 
              onClick={() => setActiveTabId(t.id)}
              className={`flex items-center gap-2 px-3 py-1 text-xs cursor-pointer rounded-t ${activeTabId === t.id ? "bg-[#111] text-white border-t border-t-[#007acc]" : "text-gray-400 hover:bg-[#2a2a2a]"}`}
            >
              {t.type === "preview" ? <Globe size={12} /> : <TerminalIcon size={12} />}
              {t.title}
              <X size={12} className="hover:text-white ml-1" onClick={(e) => closeTab(t.id, e)} />
            </div>
          ))}
          <div onClick={addTab} className="p-1 hover:bg-[#2a2a2a] cursor-pointer rounded text-gray-400 ml-1" title="New Terminal Tab">
            <Plus size={14} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isBooting && (
            <span className="text-xs text-yellow-500 animate-pulse">
              Connecting...
            </span>
          )}

          {/* Connect Local Laptop Helper */}
          <button
            onClick={() => setShowLaptopModal(true)}
            title="Connect your personal laptop terminal"
            className="flex items-center gap-1 px-2 py-1 text-xs text-sky-400 bg-sky-950/30 hover:bg-sky-900/40 border border-sky-800/40 rounded transition-colors"
          >
            <Laptop size={12} /> Connect Laptop
          </button>
          
          <button 
            onClick={handleSyncFiles}
            disabled={isSyncing}
            title="Sync files between Editor and Terminal"
            className={`flex items-center gap-1 px-2 py-1 text-xs ${isSyncing ? 'text-gray-500' : 'text-blue-400 hover:bg-blue-900/30'} border border-transparent hover:border-blue-800 rounded`}
          >
            <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} /> Sync Files
          </button>

          <button 
            onClick={goToWorkspace}
            title="Return to CodeTogether Workspace folder"
            className="flex items-center gap-1 px-2 py-1 text-xs text-amber-400 bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/40 rounded transition-colors"
          >
            <Home size={12} /> Workspace
          </button>

          <button 
            onClick={restartTerminal}
            title="Reset and clear terminal session"
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-[#262626] hover:bg-[#333] border border-gray-700/50 rounded transition-colors"
          >
            <RotateCcw size={12} /> Clear
          </button>

          <button 
            onClick={executeRun}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-900/40 text-green-400 border border-green-800 rounded cursor-pointer hover:bg-green-800/50"
          >
            <Play size={12} /> Run
          </button>

          <X size={14} className="text-gray-400 hover:text-white cursor-pointer ml-2" onClick={onClose} />
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 relative bg-[#0a0a0a]">
        {tabs.map(t => {
          if (t.type === "preview") {
            return (
              <div key={t.id} className={`absolute inset-0 flex flex-col bg-white ${activeTabId === t.id ? "flex" : "hidden"}`}>
                <div className="h-8 bg-gray-100 dark:bg-[#151515] border-b border-gray-200 dark:border-white/10 flex items-center px-3 justify-between shadow-sm z-10">
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-[11px] text-gray-500 font-mono truncate">{previewUrl || "Waiting for port..."}</span>
                  </div>
                  <a href={previewUrl || "#"} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors no-underline">
                    Open in Browser
                  </a>
                </div>
                <iframe src={previewUrl || ""} className="flex-1 w-full border-0 bg-white" allow="cross-origin-isolated" />
              </div>
            );
          }
          return (
            <div 
              key={t.id} 
              ref={(el) => { if (el) containerRefs.current.set(t.id, el); }}
              onClick={() => {
                const rt = runtimesRef.current.get(t.id);
                try { rt?.term.focus(); } catch {}
              }}
              className={`absolute inset-0 p-2 ${activeTabId === t.id ? "block" : "hidden"}`} 
            />
          );
        })}
      </div>

      {/* Connect Local Laptop Modal */}
      {showLaptopModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181824] border border-[#2a2a3e] rounded-xl max-w-lg w-full p-6 shadow-2xl relative text-left">
            <button 
              onClick={() => setShowLaptopModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <Laptop size={20} className="text-sky-400" />
              <h3 className="text-base font-semibold text-white">Connect Your Local Laptop</h3>
            </div>
            
            <p className="text-xs text-gray-400 mb-4">
              Run this one-line command in your local machine&apos;s terminal. It bridges your laptop&apos;s shell directly to this collaborative session:
            </p>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setActiveOs("mac")}
                className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${activeOs === "mac" ? "bg-sky-600 text-white" : "bg-[#252538] text-gray-400 hover:text-gray-200"}`}
              >
                macOS / Linux
              </button>
              <button
                onClick={() => setActiveOs("win")}
                className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${activeOs === "win" ? "bg-sky-600 text-white" : "bg-[#252538] text-gray-400 hover:text-gray-200"}`}
              >
                Windows (PowerShell)
              </button>
            </div>

            <div className="bg-[#0e0e16] border border-[#232336] rounded-lg p-3 relative group">
              <pre className="font-mono text-xs text-sky-200 whitespace-pre-wrap break-all select-all">
                {activeOs === "mac" ? macInstallCmd : winInstallCmd}
              </pre>
              <button
                onClick={() => copyToClipboard(activeOs === "mac" ? macInstallCmd : winInstallCmd, activeOs)}
                className="absolute top-2 right-2 p-1.5 rounded bg-[#1e1e2f] hover:bg-[#2b2b42] text-gray-300 hover:text-white transition-colors"
                title="Copy Command"
              >
                {copiedOs === activeOs ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] text-gray-400 border-t border-[#232336] pt-3">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Secure end-to-end WebSocket tunnel
              </span>
              <button
                onClick={() => setShowLaptopModal(false)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
