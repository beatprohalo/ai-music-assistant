const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectAudioFiles: () => ipcRenderer.invoke('select-audio-files'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getFilesFromFolder: (folderPath) => ipcRenderer.invoke('get-files-from-folder', folderPath),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // File system operations
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  
  // Database operations
  initializeDatabase: () => ipcRenderer.invoke('initialize-database'),
  addToLibrary: (fileData) => ipcRenderer.invoke('add-to-library', fileData),
  getLibraryStats: () => ipcRenderer.invoke('get-library-stats'),
  clearLibrary: () => ipcRenderer.invoke('clear-library'),
  
  // Audio processing
  processAudioFile: (filePath, options) => ipcRenderer.invoke('process-audio-file', filePath, options),
  generateMusic: (prompt, options) => ipcRenderer.invoke('generate-music', prompt, options),
  
  // LLM operations
  setLLMProvider: (provider, config) => ipcRenderer.invoke('set-llm-provider', provider, config),
  generateWithLLM: (prompt, context) => ipcRenderer.invoke('generate-with-llm', prompt, context),
  
  // Settings operations
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  testLLMConnection: () => ipcRenderer.invoke('test-llm-connection'),
  
  // Library operations
  getLibraryFiles: (options) => ipcRenderer.invoke('get-library-files', options)
});
