const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startSending: (data) => ipcRenderer.invoke('start-sending', data),
  pauseSending: () => ipcRenderer.send('pause-sending'),
  resumeSending: () => ipcRenderer.send('resume-sending'),
  stopSending: () => ipcRenderer.send('stop-sending'),
  onLiveLog: (callback) => ipcRenderer.on('live-log', (event, message) => callback(message))
}); 