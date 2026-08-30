const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // ── Terminal ──
  terminal: {
    create: (opts) => ipcRenderer.invoke("terminal:create", opts),
    write: (id, data) => ipcRenderer.invoke("terminal:write", { id, data }),
    resize: (id, cols, rows) => ipcRenderer.invoke("terminal:resize", { id, cols, rows }),
    kill: (id) => ipcRenderer.invoke("terminal:kill", { id }),
    onOutput: (cb) => {
      const handler = (event, payload) => cb(payload.id, payload.data);
      ipcRenderer.on("terminal:output", handler);
      return () => ipcRenderer.removeListener("terminal:output", handler);
    },
    onExit: (cb) => {
      const handler = (event, payload) => cb(payload.id, payload.exitCode);
      ipcRenderer.on("terminal:exit", handler);
      return () => ipcRenderer.removeListener("terminal:exit", handler);
    },
  },

  // ── File System ──
  fs: {
    read: (filePath) => ipcRenderer.invoke("fs:read", { filePath }),
    write: (filePath, content) => ipcRenderer.invoke("fs:write", { filePath, content }),
    list: (dirPath) => ipcRenderer.invoke("fs:list", { dirPath }),
    delete: (filePath) => ipcRenderer.invoke("fs:delete", { filePath }),
    mkdir: (dirPath) => ipcRenderer.invoke("fs:mkdir", { dirPath }),
  },

  // ── Dialog ──
  dialog: {
    openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  },

  // ── App Info ──
  app: {
    info: () => ipcRenderer.invoke("app:info"),
  },
});

// Mark that we're running in Electron
window.__IS_ELECTRON__ = true;
