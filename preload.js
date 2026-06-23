const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runOptimizer: (data, signal) => ipcRenderer.invoke('run-optimizer', data, signal),
  saveData: (key, value) => ipcRenderer.send('store-set', { key, value }),
  getData: (key) => ipcRenderer.invoke('store-get', key)
});
