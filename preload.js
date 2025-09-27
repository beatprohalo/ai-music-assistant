const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendTestMessage: () => ipcRenderer.send('test-ipc'),
  handleIpcReply: (callback) => ipcRenderer.on('test-ipc-reply', callback),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
});