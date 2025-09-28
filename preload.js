const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => {
    // A wrapper is used to avoid exposing the full `event` object
    ipcRenderer.on(channel, (event, ...args) => listener(...args));
  }
});