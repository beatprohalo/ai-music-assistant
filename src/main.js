const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

// Import our modules
const AudioAnalyzer = require('./audio/AudioAnalyzer');
const VectorDatabase = require('./database/VectorDatabase');
const LLMOrchestrator = require('./llm/LLMOrchestrator');
const MusicGenerator = require('./generation/MusicGenerator');

let mainWindow;

// Initialize our modules
const audioAnalyzer = new AudioAnalyzer();
const vectorDB = new VectorDatabase(path.join(__dirname, '../data/library.db'));
const llmOrchestrator = new LLMOrchestrator();
const musicGenerator = new MusicGenerator();

// Settings storage
let settings = {
  llmProvider: 'none',
  openaiApiKey: '',
  anthropicApiKey: '',
  googleApiKey: '',
  localModelPath: '',
  audioAnalysis: {
    extractFeatures: true,
    generateEmbeddings: true,
    maxFileSize: 100,
    supportedFormats: ['wav', 'mp3', 'flac', 'aiff', 'm4a', 'mid', 'midi']
  },
  database: {
    autoBackup: true,
    backupInterval: 24,
    maxBackups: 5
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f0f',
    show: false
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for file operations
ipcMain.handle('select-audio-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['wav', 'mp3', 'flac', 'aiff', 'm4a'] },
      { name: 'MIDI Files', extensions: ['mid', 'midi'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

ipcMain.handle('get-files-from-folder', async (event, folderPath) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const supportedExtensions = ['.wav', '.mp3', '.flac', '.aiff', '.m4a', '.ogg', '.aac', '.mid', '.midi'];
    const files = [];
    
    function scanDirectory(dirPath) {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Recursively scan subdirectories
          scanDirectory(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (supportedExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }
    
    scanDirectory(folderPath);
    return files;
  } catch (error) {
    throw new Error(`Failed to scan folder: ${error.message}`);
  }
});

ipcMain.handle('select-output-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// File system operations
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return data;
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, data);
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
});

// Database operations
ipcMain.handle('initialize-database', async () => {
  try {
    // Database is already initialized in the constructor
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to initialize database: ${error.message}`);
  }
});

ipcMain.handle('add-to-library', async (event, fileData) => {
  try {
    const fileId = await vectorDB.addFile(fileData);
    return { success: true, fileId };
  } catch (error) {
    throw new Error(`Failed to add file to library: ${error.message}`);
  }
});

ipcMain.handle('get-library-stats', async () => {
  try {
    const stats = await vectorDB.getLibraryStats();
    return stats;
  } catch (error) {
    throw new Error(`Failed to get library stats: ${error.message}`);
  }
});

ipcMain.handle('get-library-files', async (event, options = {}) => {
  try {
    const files = await vectorDB.getAllFiles(options);
    return files;
  } catch (error) {
    throw new Error(`Failed to get library files: ${error.message}`);
  }
});

ipcMain.handle('clear-library', async () => {
  try {
    await vectorDB.clearLibrary();
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to clear library: ${error.message}`);
  }
});

ipcMain.handle('reindex-library', async () => {
  try {
    // Reindexing would involve re-analyzing all files
    // For now, just return success
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to reindex library: ${error.message}`);
  }
});

// Audio processing
ipcMain.handle('process-audio-file', async (event, filePath, options = {}) => {
  try {
    const analysis = await audioAnalyzer.analyzeFile(filePath, options);
    return analysis;
  } catch (error) {
    throw new Error(`Failed to process audio file: ${error.message}`);
  }
});

// Music generation
ipcMain.handle('generate-music', async (event, prompt, options = {}) => {
  try {
    // Get similar files from library for context
    let context = {};
    if (options.generateEmbeddings && settings.audioAnalysis.generateEmbeddings) {
      // This would involve generating embeddings for the prompt and finding similar files
      // For now, we'll skip this step
    }

    // Generate music using the LLM orchestrator if available
    if (settings.llmProvider !== 'none') {
      const llmResponse = await llmOrchestrator.generateMusicPrompt(prompt, context);
      // Parse the LLM response to extract musical parameters
      // This would be more sophisticated in a real implementation
    }

    const music = await musicGenerator.generateMusic(prompt, options);
    return music;
  } catch (error) {
    throw new Error(`Failed to generate music: ${error.message}`);
  }
});

// LLM operations
ipcMain.handle('set-llm-provider', async (event, provider, config) => {
  try {
    await llmOrchestrator.setProvider(provider, config);
    settings.llmProvider = provider;
    settings = { ...settings, ...config };
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to set LLM provider: ${error.message}`);
  }
});

ipcMain.handle('generate-with-llm', async (event, prompt, context = {}) => {
  try {
    const response = await llmOrchestrator.generate(prompt, context);
    return response;
  } catch (error) {
    throw new Error(`Failed to generate with LLM: ${error.message}`);
  }
});

// Settings operations
ipcMain.handle('get-settings', async () => {
  return settings;
});

ipcMain.handle('save-settings', async (event, newSettings) => {
  try {
    settings = { ...settings, ...newSettings };
    
    // Update LLM provider if changed
    if (newSettings.llmProvider) {
      const config = {
        apiKey: newSettings.openaiApiKey || newSettings.anthropicApiKey || newSettings.googleApiKey,
        modelPath: newSettings.localModelPath
      };
      await llmOrchestrator.setProvider(newSettings.llmProvider, config);
    }
    
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to save settings: ${error.message}`);
  }
});

ipcMain.handle('test-llm-connection', async () => {
  try {
    const result = await llmOrchestrator.testConnection();
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});
