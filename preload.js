const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('opencode', {
  onData: (cb) => ipcRenderer.on('terminal-data', (_event, data) => cb(data)),
  onExit: (cb) => ipcRenderer.on('terminal-exit', (_event, data) => cb(data)),
  sendInput: (data) => ipcRenderer.send('terminal-input', data),
  resize: (cols, rows) => ipcRenderer.send('terminal-resize', { cols, rows }),
});
