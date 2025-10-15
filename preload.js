const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // IPC methods
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => {
    ipcRenderer.on(channel, (event, ...args) => listener(...args));
  },
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // File system operations (to be handled via IPC)
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openAudioDialog: () => ipcRenderer.invoke('open-audio-dialog'),
  openMidiDialog: () => ipcRenderer.invoke('open-midi-dialog'),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),

  // Window operations
  openSettingsWindow: () => ipcRenderer.invoke('open-settings-window'),
  openMainWindow: () => ipcRenderer.invoke('open-main-window'),
  openTestWindow: () => ipcRenderer.invoke('open-test-window'),
  openSettingsTestWindow: () => ipcRenderer.invoke('open-settings-test-window'),
  openDebugTest: () => ipcRenderer.invoke('open-debug-test'),

  // Test IPC
  testIPC: () => ipcRenderer.invoke('test-ipc'),

  // File system operations
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
  createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

  // Settings management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // File download and save operations
  downloadFile: (filePath) => ipcRenderer.invoke('download-file', { filePath }),
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // Library management
  setLibraryPath: (path) => ipcRenderer.invoke('set-library-path', path),
  getLibraryPath: () => ipcRenderer.invoke('get-library-path'),
  saveToLibrary: (data) => ipcRenderer.invoke('save-to-library', data),
  getLibraryFiles: (category) => ipcRenderer.invoke('get-library-files', category),
  getLibraryCategories: () => ipcRenderer.invoke('get-library-categories'),
  clearLibrary: () => ipcRenderer.invoke('clear-library'),
  reindexLibrary: () => ipcRenderer.invoke('reindex-library'),
  
  // Audio playback
  playAudioFile: (filePath) => ipcRenderer.invoke('play-audio-file', filePath),
  // Analysis functions
  analyzeAudioFile: (filePath) => ipcRenderer.invoke('process-audio-file', filePath),
  analyzeMidiFile: (filePath) => ipcRenderer.invoke('analyze-midi-file', filePath),
  generateMidi: (prompt, settings) => ipcRenderer.invoke('generate-midi', prompt, settings),

  // Directory operations
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  scanFolderSafe: (dirPath) => ipcRenderer.invoke('scan-folder-safe', dirPath),
  cancelFolderScan: () => ipcRenderer.invoke('cancel-folder-scan'),
  
  // Database operations
  purgeDatabase: () => ipcRenderer.invoke('purge-database'),
  clearLocalStorage: () => ipcRenderer.invoke('clear-local-storage'),
  saveFileToDatabase: (fileData) => ipcRenderer.invoke('save-file-to-database', fileData),
  getDatabaseFiles: () => ipcRenderer.invoke('get-database-files'),
  loadDatabaseFiles: () => ipcRenderer.invoke('load-database-files'),
  
  // Debug
  debugTest: (message) => ipcRenderer.invoke('debug-test', message),
  
      // Status and monitoring
    getSystemStatus: () => ipcRenderer.invoke('get-system-status'),
    askStatusQuestion: (question) => ipcRenderer.invoke('ask-status-question', question),
    getInstrumentCounts: () => ipcRenderer.invoke('get-instrument-counts'),
    getMLDataSummary: () => ipcRenderer.invoke('get-ml-data-summary'),
});