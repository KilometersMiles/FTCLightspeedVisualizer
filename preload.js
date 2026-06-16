const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runOptimizer: (data) => ipcRenderer.invoke('run-optimizer', data)
});