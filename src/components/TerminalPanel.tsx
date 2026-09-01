
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebContainer } from "@webcontainer/api";
import "@xterm/xterm/css/xterm.css";
import {
  X, Play, Plus, Terminal as TerminalIcon, RefreshCw, Globe
} from "lucide-react";
import type { FileItem } from "@/components/FileExplorer";

let webcontainerPromise: Promise<WebContainer> | null = null;

type TerminalPanelProps = {
  onClose: () => void;
  roomId: string;
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
};

type TabRuntime = {
  term: XTerm;
  fit: FitAddon;
  process: any;
  inputWriter: WritableStreamDefaultWriter | null;
};

export default function TerminalPanel({
  onClose, roomId, codeRef, language, activeFileName,
  triggerRun = 0, files = [], onFilesSync, onOutputLog, onServerReady
}: TerminalPanelProps) {
  const [height, setHeight] = useState(280);
  const [tabs, setTabs] = useState<TerminalTab[]>([{ id: "tab-1", title: "1: terminal", terminalId: `term_${roomId}_1` }]);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  const [isBooting, setIsBooting] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const runtimesRef = useRef<Map<string, TabRuntime>>(new Map());
  const webcontainerRef = useRef<WebContainer | null>(null);

  // Boot WebContainer
  useEffect(() => {
    async function boot() {
      try {
        if (!webcontainerPromise) webcontainerPromise = WebContainer.boot();
        webcontainerRef.current = await webcontainerPromise;
        
        webcontainerRef.current.on('server-ready', (port, url) => {
          setPreviewUrl(url);
          if (onServerReady) onServerReady(url, port);
          setTabs(prev => {
            if (prev.find(t => t.type === "preview")) return prev;
            return [...prev, { id: "preview-tab", title: `Port ${port}`, terminalId: "preview", type: "preview" }];
          });
          setActiveTabId("preview-tab");
        });

        setIsBooting(false);
      } catch (err) {
        console.error("Failed to boot WebContainer", err);
      }
    }
    boot();
  }, []);

  // Sync files to WebContainer
  useEffect(() => {
    if (!webcontainerRef.current || files.length === 0) return;
    const tree: any = {};
    for (const f of files) {
      if (!f.isFolder && f.name) {
        const path = f.path || f.name;
        const parts = path.split('/');
        let current = tree;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = { directory: {} };
          current = current[parts[i]].directory;
        }
        current[parts[parts.length - 1]] = { file: { contents: f.content || "" } };
      }
    }
    webcontainerRef.current.mount(tree).catch(console.error);
  }, [files, isBooting]);

  // Sync WebContainer files back to Workspace
  const syncFromWebContainer = async () => {
    if (!webcontainerRef.current || !onFilesSync) return;
    setIsSyncing(true);
    
    const readDirRecursively = async (dir: string, basePath: string): Promise<FileItem[]> => {
      let items: FileItem[] = [];
      try {
        const entries = await webcontainerRef.current!.fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === "node_modules" || entry.name === ".git") continue;
          
          const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            items.push({ name: entry.name, path: fullPath, isFolder: true, content: "", language: "" });
            const children = await readDirRecursively(`${dir}/${entry.name}`, fullPath);
            items = items.concat(children);
          } else {
            const content = await webcontainerRef.current!.fs.readFile(`${dir}/${entry.name}`, 'utf8');
            const ext = entry.name.split('.').pop() || '';
            let lang = "plaintext";
            if (ext === "js" || ext === "jsx") lang = "javascript";
            if (ext === "ts" || ext === "tsx") lang = "typescript";
            if (ext === "css") lang = "css";
            if (ext === "html") lang = "html";
            if (ext === "json") lang = "json";
            items.push({ name: entry.name, path: fullPath, isFolder: false, content, language: lang });
          }
        }
      } catch (err) {}
      return items;
    };

    const newFiles = await readDirRecursively('.', '');
    onFilesSync(newFiles);
    setIsSyncing(false);
  };

  // Init Terminal
  const initTerminal = useCallback(async (tabId: string, container: HTMLDivElement) => {
    if (runtimesRef.current.has(tabId) || tabId === "preview-tab") return;

    const term = new XTerm({
      theme: { background: "#0a0a0a", foreground: "#cccccc", cursor: "#ffffff", selectionBackground: "rgba(255,255,255,0.25)" },
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      fontSize: 13,
      cursorBlink: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    fit.fit();

    const rt: TabRuntime = { term, fit, process: null, inputWriter: null };
    runtimesRef.current.set(tabId, rt);

    const ro = new ResizeObserver(() => fit.fit());
    ro.observe(container);

    term.writeln("[36mWaiting for WebContainer to boot...[0m");

    if (!webcontainerRef.current) {
        if (!webcontainerPromise) webcontainerPromise = WebContainer.boot();
        webcontainerRef.current = await webcontainerPromise;
    }
    
    term.writeln("[32mWebContainer connected![0m");

    const process = await webcontainerRef.current.spawn("jsh", {
      terminal: { cols: term.cols, rows: term.rows }
    });
    rt.process = process;

    process.output.pipeTo(new WritableStream({
      write(data) {
        term.write(data);
        onOutputLog?.(data);
      }
    }));

    const input = process.input.getWriter();
    rt.inputWriter = input;
    term.onData((data) => {
      input.write(data);
    });
    
    term.onResize((size) => {
      process.resize({ cols: size.cols, rows: size.rows });
    });

  }, [onOutputLog]);

  useEffect(() => {
    tabs.forEach(tab => {
      if (tab.type === "preview") return;
      const el = containerRefs.current.get(tab.id);
      if (el && !runtimesRef.current.has(tab.id)) {
        initTerminal(tab.id, el);
      }
    });
  }, [tabs, initTerminal]);

  // Run Code
  useEffect(() => {
    if (triggerRun === 0) return;
    const run = async () => {
      const rt = runtimesRef.current.get(activeTabId);
      if (!rt || !rt.inputWriter || !activeFileName) return;
      
      let cmd = "";
      if (language === "javascript" || activeFileName.endsWith(".js")) cmd = `node "${activeFileName}"`;
      else if (language === "python" || activeFileName.endsWith(".py")) cmd = `python3 "${activeFileName}"`;
      else if (language === "cpp" || activeFileName.endsWith(".cpp")) cmd = `g++ "${activeFileName}" && ./a.out`;
      else if (language === "java" || activeFileName.endsWith(".java")) cmd = `javac "${activeFileName}" && java "${activeFileName.replace(".java", "")}"`;
      else cmd = `./"${activeFileName}"`;

      rt.term.writeln(`\r\n\x1b[32m▶ Running ${activeFileName}...\x1b[0m\r\n`);
      rt.inputWriter.write(cmd + "\n");
    };
    run();
  }, [triggerRun]);

  const addTab = () => {
    const id = `tab-${Date.now()}`;
    setTabs([...tabs, { id, title: `${tabs.length + 1}: terminal`, terminalId: `term_${roomId}_${Date.now()}` }]);
    setActiveTabId(id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === "preview-tab") {
        setPreviewUrl(null);
    }
    const rt = runtimesRef.current.get(id);
    if (rt) {
      rt.process?.kill();
      rt.term.dispose();
      runtimesRef.current.delete(id);
    }
    const newTabs = tabs.filter(t => t.id !== id);
    if (newTabs.length === 0) onClose();
    else {
      setTabs(newTabs);
      if (activeTabId === id) setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  return (
    <div style={{ height }} className="flex flex-col bg-[#111111] border-t border-[#333] relative">
      {/* Resizer */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 cursor-row-resize z-50 hover:bg-[#007acc] transition-colors"
        onPointerDown={(e) => {
          const startY = e.clientY;
          const startH = height;
          const onMove = (ev: PointerEvent) => setHeight(Math.max(100, Math.min(800, startH + (startY - ev.clientY))));
          const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
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
          <div onClick={addTab} className="p-1 hover:bg-[#2a2a2a] cursor-pointer rounded text-gray-400 ml-1"><Plus size={14} /></div>
        </div>
        <div className="flex items-center gap-2">
          {isBooting && <span className="text-xs text-yellow-500 animate-pulse">Booting WebContainer...</span>}
          
          <button 
            onClick={syncFromWebContainer}
            disabled={isSyncing}
            title="Sync files from Terminal to Workspace"
            className={`flex items-center gap-1 px-2 py-1 text-xs ${isSyncing ? 'text-gray-500' : 'text-blue-400 hover:bg-blue-900/30'} border border-transparent hover:border-blue-800 rounded`}
          >
            <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} /> Sync Files
          </button>

          <button className="flex items-center gap-1 px-2 py-1 text-xs bg-green-900/40 text-green-400 border border-green-800 rounded">
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
              className={`absolute inset-0 p-2 ${activeTabId === t.id ? "block" : "hidden"}`} 
            />
          );
        })}
      </div>
    </div>
  );
}
