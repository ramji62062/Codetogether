/**
 * Electron Bridge
 * Detects if running in Electron and provides typed access to native APIs.
 * Falls back to web-based APIs when not in Electron.
 */

export interface ElectronTerminalAPI {
  create: (opts: { id: string; cols: number; rows: number; cwd?: string }) => Promise<{ ok: boolean; pid: number; shell: string }>;
  write: (id: string, data: string) => Promise<boolean>;
  resize: (id: string, cols: number, rows: number) => Promise<boolean>;
  kill: (id: string) => Promise<boolean>;
  onOutput: (cb: (id: string, data: string) => void) => () => void;
  onExit: (cb: (id: string, exitCode: number) => void) => () => void;
}

export interface ElectronFSAPI {
  read: (filePath: string) => Promise<{ content?: string; mtimeMs?: number; size?: number; error?: string }>;
  write: (filePath: string, content: string) => Promise<{ ok?: boolean; mtimeMs?: number; size?: number; error?: string }>;
  list: (dirPath: string) => Promise<any[]>;
  delete: (filePath: string) => Promise<{ ok?: boolean; error?: string }>;
  mkdir: (dirPath: string) => Promise<{ ok?: boolean; error?: string }>;
}

export interface ElectronDialogAPI {
  openFolder: () => Promise<string | null>;
}

export interface ElectronAppAPI {
  info: () => Promise<{ platform: string; arch: string; homedir: string; shell: string; version: string }>;
}

declare global {
  interface Window {
    __IS_ELECTRON__?: boolean;
    electronAPI?: {
      terminal: ElectronTerminalAPI;
      fs: ElectronFSAPI;
      dialog: ElectronDialogAPI;
      app: ElectronAppAPI;
    };
  }
}

/** Check if running inside Electron */
export function isElectron(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.__IS_ELECTRON__ && window.electronAPI);
}

/** Get the Electron API (throws if not in Electron) */
export function getElectronAPI() {
  if (!isElectron()) throw new Error("Not running in Electron");
  return window.electronAPI!;
}

/** Safe getter that returns null if not in Electron */
export function getElectronAPIOrNull() {
  return isElectron() ? window.electronAPI! : null;
}
