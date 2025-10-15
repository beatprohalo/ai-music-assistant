const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const mlEngine = require('./ml-engine');
const llmOrchestrator = require('./llm-orchestrator');
const midiAnalyzer = require('./midi-analyzer');
const audioAnalyzer = require('./audio-analyzer');
const featureExtractor = require('./feature-extractor');
const vectorDB = require('./vector-database');
const midiGenerator = require('./midi-generator');

let mainWindow;

// --- Backend State and Logic ---
const userDataPath = app.getPath('userData');
const configDir = path.join(userDataPath, 'HumanizerAI');
const dataFilePath = path.join(configDir, 'data.json');
const settingsFilePath = path.join(configDir, 'settings.json');

let loadedFiles = [];
let appSettings = {
    localLlmEnabled: true,
    cloudLlmProvider: 'none',
    apiKey: '',
    modelSize: 'medium',
    temperature: 0.7
};

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

async function saveAppState() {
    try {
        await fs.promises.writeFile(dataFilePath, JSON.stringify(loadedFiles, null, 2));
        await fs.promises.writeFile(settingsFilePath, JSON.stringify(appSettings, null, 2));
        return { success: true };
    } catch (error) {
        console.error('Failed to save app state:', error);
        return { success: false, error: error.message };
    }
}

async function loadAppState() {
    try {
        let loadedFileData = [];
        if (fs.existsSync(dataFilePath)) {
            const data = await fs.promises.readFile(dataFilePath, 'utf8');
            loadedFileData = JSON.parse(data);
            loadedFiles = loadedFileData; // Update server-side state
        }

        let loadedSettingsData = {};
        if (fs.existsSync(settingsFilePath)) {
            const settings = await fs.promises.readFile(settingsFilePath, 'utf8');
            loadedSettingsData = JSON.parse(settings);
            appSettings = { ...appSettings, ...loadedSettingsData }; // Update server-side state
        }

        return { success: true, files: loadedFileData, settings: appSettings };
    } catch (error) {
        console.error('Failed to load app state:', error);
        return { success: false, error: error.message };
    }
}

function generateQueryVector(prompt, files) {
    const vector = Array.from({ length: 6 }, () => Math.random());
    if (files && files.length > 0) {
        const midiFiles = files.filter(f => f.type === 'midi').length;
        const audioFiles = files.filter(f => f.type === 'audio').length;
        vector[0] = midiFiles / Math.max(files.length, 1);
        vector[1] = audioFiles / Math.max(files.length, 1);
    }
    return vector;
}

async function handleGeneration(generationType, prompt) {
     if (!prompt) {
        return { success: false, error: 'Please enter a musical prompt.' };
    }

    try {
        mainWindow.webContents.send('log-to-oled', `LLM Request for ${generationType.toUpperCase()}: "${prompt}"`);
        if (loadedFiles.length === 0) {
            mainWindow.webContents.send('log-to-oled', '⚠️ No files loaded. Upload some MIDI/audio files for better results.');
        }

        const queryVector = generateQueryVector(prompt, loadedFiles);
        const { response: llmResponse, sourceFiles, patterns: analysisPatterns } = await llmOrchestrator.generateLlmResponse(prompt, queryVector, generationType === 'humanize' ? 'humanization' : 'pattern');

        let fullLog = `LLM Response (${generationType.toUpperCase()}): ${llmResponse}`;
        if (sourceFiles && sourceFiles.length > 0) {
            fullLog += `\n  - Referenced files: ${sourceFiles.map(s => path.basename(s)).join(', ')}`;
        }
        mainWindow.webContents.send('log-to-oled', fullLog);

        if (generationType === 'midi' || generationType === 'both') {
            mainWindow.webContents.send('log-to-oled', 'Attempting to generate MIDI...');
            const outputDir = path.join(userDataPath, 'HumanizerAI', 'generated');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            const outputFilePath = path.join(outputDir, `generated_midi_${Date.now()}.mid`);
            const generatedPath = await midiGenerator.generateMidiFromLLMResponse(llmResponse, outputFilePath, analysisPatterns);
            mainWindow.webContents.send('log-to-oled', `MIDI generated successfully: ${path.basename(generatedPath)}`);
            return { success: true, generatedPath: path.basename(generatedPath) };
        }
        return { success: true };
    } catch (error) {
        console.error('Generation Error:', error);
        mainWindow.webContents.send('log-to-oled', `Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: true
        }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Test IPC handler first
    ipcMain.handle('test-ipc', async () => {
        console.log('Test IPC handler called');
        return { success: true, message: 'IPC is working' };
    });

    // IPC handlers for file dialogs
    ipcMain.handle('open-file-dialog', async () => {
        console.log('File dialog IPC handler called');
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                properties: ['openFile', 'multiSelections'],
                filters: [
                    { name: 'Audio & MIDI', extensions: ['mp3', 'wav', 'flac', 'aiff', 'aif', 'm4a', 'ogg', 'aac', 'mid', 'midi'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            console.log('File dialog result:', { canceled, filePaths });
            return canceled ? [] : filePaths;
        } catch (error) {
            console.error('File dialog error:', error);
            throw error;
        }
    });

    ipcMain.handle('open-folder-dialog', async (event) => {
        console.log('Folder dialog IPC handler called');
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                properties: ['openDirectory']
            });
            console.log('Folder dialog result:', { canceled, filePaths });
            return canceled ? null : filePaths[0];
        } catch (error) {
            console.error('Folder dialog error:', error);
            throw error;
        }
    });

    // Alternative IPC handler using ipcMain.on
    ipcMain.on('open-folder-dialog-sync', async (event) => {
        console.log('Folder dialog sync IPC handler called');
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                properties: ['openDirectory']
            });
            console.log('Folder dialog sync result:', { canceled, filePaths });
            event.reply('folder-dialog-result', canceled ? null : filePaths[0]);
        } catch (error) {
            console.error('Folder dialog sync error:', error);
            event.reply('folder-dialog-error', error.message);
        }
    });

    // IPC handler for opening settings window
    ipcMain.handle('open-settings-window', async () => {
        const settingsWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1000,
            minHeight: 700,
            frame: false,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: true,
                contextIsolation: true,
            }
        });

        settingsWindow.loadFile('settings.html');
        return true;
    });

    // IPC handler for opening main window
    ipcMain.handle('open-main-window', async () => {
        const newMainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1000,
            minHeight: 700,
            frame: false,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: true,
                contextIsolation: true,
            }
        });

        newMainWindow.loadFile('index.html');
        return true;
    });

    // IPC handler for opening test window
    ipcMain.handle('open-test-window', async () => {
        const testWindow = new BrowserWindow({
            width: 800,
            height: 600,
            minWidth: 600,
            minHeight: 400,
            frame: true,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: true,
                contextIsolation: true,
            }
        });

        testWindow.loadFile('test-buttons.html');
        return true;
    });

    // IPC handler for opening settings test window
    ipcMain.handle('open-settings-test-window', async () => {
        const testWindow = new BrowserWindow({
            width: 800,
            height: 600,
            minWidth: 600,
            minHeight: 400,
            frame: true,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: true,
                contextIsolation: true
            }
        });

        testWindow.loadFile('test-settings.html');
        return true;
    });

    // --- IPC Handlers for Backend Logic ---
    ipcMain.handle('initialize-app', async () => {
        mainWindow.webContents.send('log-to-oled', 'Initializing Backend...');

        const loadedState = await loadAppState();
        if (loadedState.success) {
            llmOrchestrator.configureLlm(loadedState.settings);
            mainWindow.webContents.send('log-to-oled', 'Loaded settings from storage.');
            if (loadedState.files && loadedState.files.length > 0) {
                mainWindow.webContents.send('log-to-oled', `Loaded ${loadedState.files.length} files from storage.`);
            } else {
                mainWindow.webContents.send('log-to-oled', 'No previous file data found.');
            }
        } else {
            mainWindow.webContents.send('log-to-oled', `Error loading state: ${loadedState.error}`);
        }

        mainWindow.webContents.send('log-to-oled', 'Initializing ML models...');
        try {
            const basicPitch = await mlEngine.loadBasicPitchModel();
            const humanizer = await mlEngine.loadHumanizerModel();
            if (basicPitch && humanizer) {
                mainWindow.webContents.send('log-to-oled', 'All ML models ready.');
            } else {
                mainWindow.webContents.send('log-to-oled', 'Warning: Some ML models failed to load.');
            }
        } catch (error) {
            mainWindow.webContents.send('log-to-oled', `Error initializing ML models: ${error.message}`);
        }

        mainWindow.webContents.send('log-to-oled', 'Initializing Vector Database...');
        try {
            const dbStatus = await vectorDB.initVectorDatabase();
            if (dbStatus) {
                mainWindow.webContents.send('log-to-oled', 'Vector Database ready.');
            } else {
                mainWindow.webContents.send('log-to-oled', 'Error: Vector Database failed to initialize.');
            }
        } catch (error) {
            mainWindow.webContents.send('log-to-oled', `Error initializing Vector DB: ${error.message}`);
        }

        return loadedState;
    });

    ipcMain.handle('handle-generation', async (event, { generationType, prompt }) => {
        return await handleGeneration(generationType, prompt);
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
