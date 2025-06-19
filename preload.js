const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startSending: (data) => ipcRenderer.invoke('start-sending', data)
}); 