const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runOptimizer: (data) => ipcRenderer.invoke('run-optimizer', data),
  saveData: (key, value) => ipcRenderer.send('store-set', { key, value }),
  getData: (key) => ipcRenderer.invoke('store-get', key)
});
