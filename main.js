const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const StatusSystem = require('./status-system-simple');
const musicGenerator = require('./music-generator');
const { Midi } = require('@tonejs/midi');
const { initializeFileHandlers } = require('./ipc-handlers/file-handlers');
const mlEngine = require('./ml-engine');
const llmOrchestrator = require('./llm-orchestrator');
const midiAnalyzer = require('./midi-analyzer');
const audioAnalyzer = require('./audio-analyzer');
const featureExtractor = require('./feature-extractor');
const vectorDB = require('./vector-database');
const midiGenerator = require('./midi-generator');

let mainWindow;
let cancelFolderScan = false;
let statusSystem = null;

// Helper function to generate MIDI notes from music structure
function generateMidiNotes(musicStructure) {
    const notes = [];
    let currentTime = 0;
    
    // Extract chord progression from music structure
    const chordProgression = musicStructure.harmony?.chord_progression || ['C', 'Am', 'F', 'G'];
    const tempo = musicStructure.rhythm?.tempo || 120;
    const beatsPerBar = 4;
    const beatDuration = 60 / tempo; // seconds per beat
    
    console.log('Generating chord progression:', chordProgression);
    
    // Generate chord progression
    chordProgression.forEach((chord, chordIndex) => {
        const startTime = chordIndex * beatsPerBar * beatDuration;
        const chordNotes = getChordNotes(chord, 4); // 4-note chord
        
        // Add each note of the chord
        chordNotes.forEach((note, noteIndex) => {
            notes.push({
                midi: note,
                time: startTime + (noteIndex * 0.1), // Slight arpeggiation
                duration: beatsPerBar * beatDuration - (noteIndex * 0.1),
                velocity: 60 + Math.floor(Math.random() * 20)
            });
        });
    });
    
    return notes;
}

function getChordNotes(chord, octave = 4) {
    const chordMap = {
        'C': [0, 4, 7, 12],
        'D': [2, 6, 9, 14],
        'E': [4, 8, 11, 16],
        'F': [5, 9, 12, 17],
        'G': [7, 11, 14, 19],
        'A': [9, 13, 16, 21],
        'B': [11, 15, 18, 23],
        'Am': [9, 12, 16, 21],
        'Bm': [11, 14, 18, 23],
        'Cm': [0, 3, 7, 12],
        'Dm': [2, 5, 9, 14],
        'Em': [4, 7, 11, 16],
        'Fm': [5, 8, 12, 17],
        'Gm': [7, 10, 14, 19],
        // Jazz chords
        'Cmaj7': [0, 4, 7, 11],
        'Am7': [9, 12, 16, 19],
        'Dm7': [2, 5, 9, 12],
        'G7': [7, 11, 14, 17]
    };

    const baseNotes = chordMap[chord] || chordMap['C'];
    return baseNotes.map(note => note + (octave * 12));
}

/*
  scanFolderSafe was moved to ./ipc-handlers/file-handlers.js to centralize
  IPC-related file operations. Import it from there instead of keeping a
  duplicate implementation here.
*/
const { scanFolderSafe } = require('./ipc-handlers/file-handlers');

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
        const { response: llmResponse, sourceFiles } = await llmOrchestrator.generateLlmResponse(prompt, queryVector, generationType === 'humanize' ? 'humanization' : 'pattern');

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
            const generatedPath = await midiGenerator.generateMidiFromLLMResponse(llmResponse, outputFilePath);
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
            nodeIntegration: false,
            contextIsolation: true,
            additionalArguments: [`--user-data-path=${app.getPath('userData')}`]
        }
    });

    // Initialize file handlers with the main window
    initializeFileHandlers(mainWindow);

    mainWindow.loadFile('index.html');
}

let appSettingsCache = null;

async function loadSettingsFromDisk() {
    if (appSettingsCache) return appSettingsCache;

    try {
        const settingsPath = path.join(app.getPath('userData'), 'ai-music-assistant-settings.json');
        const buffer = await fsp.readFile(settingsPath, 'utf8');
        appSettingsCache = JSON.parse(buffer);
        return appSettingsCache;
    } catch (error) {
        console.warn('No settings file found. Using defaults. Error:', error.message);
        appSettingsCache = {
            localLlmEnabled: false,
            cloudLlmProvider: 'none',
            apiKey: '',
            modelSize: 'medium',
            temperature: 0.7
        };
        return appSettingsCache;
    }
}

async function saveSettingsToDisk(settings) {
    const settingsPath = path.join(app.getPath('userData'), 'ai-music-assistant-settings.json');
    const folder = path.dirname(settingsPath);

    await fsp.mkdir(folder, { recursive: true });
    await fsp.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    appSettingsCache = settings;
}

// IPC Handlers - moved outside app.whenReady() to ensure they're available immediately
ipcMain.handle('test-ipc', async () => ({ success: true, message: 'IPC is working' }));

// Window operations - moved outside app.whenReady() to ensure they're available immediately
ipcMain.handle('open-settings-window', async () => {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    await win.loadFile('settings-simple.html');
    return true;
});

ipcMain.handle('open-main-window', async () => {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    await win.loadFile('index.html');
    return true;
});

ipcMain.handle('open-test-window', async () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 600,
        minHeight: 400,
        frame: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    await win.loadFile('test-buttons.html');
    return true;
});

ipcMain.handle('open-settings-test-window', async () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 600,
        minHeight: 400,
        frame: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    await win.loadFile('test-settings.html');
    return true;
});

ipcMain.handle('open-debug-test', async () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 600,
        minHeight: 400,
        frame: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    await win.loadFile('debug-test.html');
    return true;
});

// File operations
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        // If it's just a filename (like README.md), look in the project root
        if (!path.isAbsolute(filePath) && !filePath.includes('/') && !filePath.includes('\\')) {
            const projectRoot = __dirname;
            filePath = path.join(projectRoot, filePath);
        }
        
        const content = await fs.readFile(filePath, 'utf8');
        return content;
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
});

// Settings handlers
ipcMain.handle('get-settings', async () => {
    return await loadSettingsFromDisk();
});

ipcMain.handle('save-settings', async (event, settings) => {
    await saveSettingsToDisk(settings);
    return { success: true };
});

// Database operations
ipcMain.handle('purge-database', async () => {
    try {
        if (statusSystem) {
            await statusSystem.purgeDatabase();
            return { success: true };
        } else {
            return { success: false, error: 'Status system not initialized' };
        }
    } catch (error) {
        console.error('Failed to purge database:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('clear-local-storage', async () => {
    try {
        const settingsPath = path.join(app.getPath('userData'), 'ai-music-assistant-settings.json');
        await fsp.unlink(settingsPath);
        appSettingsCache = null;
        return { success: true };
    } catch (error) {
        if (error.code === 'ENOENT') {
            return { success: true };
        }
        console.error('Failed to clear local storage:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('debug-test', async (event, message) => {
    console.log('Debug test message:', message);
    return { success: true, reply: `You sent: ${message}` };
});

// Database operations for file persistence
ipcMain.handle('save-file-to-database', async (event, fileData) => {
    try {
        console.log('Saving file to database:', fileData.fileName);
        
        if (statusSystem) {
            // Save to StatusSystem database
            const result = await statusSystem.addFile(fileData);
            
            if (result.success) {
                console.log(`✅ File ${fileData.fileName} saved to database`);
                return { success: true, fileId: result.fileId };
            } else {
                console.error(`❌ Failed to save file ${fileData.fileName}:`, result.error);
                return { success: false, error: result.error };
            }
        } else {
            return { success: false, error: 'Status system not initialized' };
        }
    } catch (error) {
        console.error('Error saving file to database:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-database-files', async () => {
    try {
        if (statusSystem) {
            const files = await statusSystem.getAllFiles();
            return { success: true, files: files };
        } else {
            return { success: false, error: 'Status system not initialized' };
        }
    } catch (error) {
        console.error('Error getting database files:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-database-files', async () => {
    try {
        if (statusSystem) {
            const files = await statusSystem.getAllFiles();
            console.log(`📁 Loaded ${files.length} files from database`);
            return { success: true, files: files };
        } else {
            return { success: false, error: 'Status system not initialized' };
        }
    } catch (error) {
        console.error('Error loading database files:', error);
        return { success: false, error: error.message };
    }
});

app.whenReady().then(async () => {
    createWindow();

    statusSystem = new StatusSystem(app.getPath('userData'));
    await statusSystem.initialize();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('generate-midi', async (event, prompt, context = {}, opts = {}, settings = {}) => {
    console.log('Received generate-midi request with prompt:', prompt);

    try {
        // Use the proper MusicGenerator class for chord progressions
        const MusicGenerator = require('./src/generation/MusicGenerator');
        const musicGenerator = new MusicGenerator();
        
        // Generate music with harmonic style to focus on chord progressions
        const musicResult = await musicGenerator.generateMusic(prompt, {
            style: 'harmonic',
            outputFormat: 'raw', // Use raw format to get the music structure directly
            tempo: 120,
            key: 'C major',
            duration: 16
        });
        
        // Extract the actual music data from the formatted result
        const music = musicResult.data || musicResult;
        
        console.log('Generated music structure:', JSON.stringify(music, null, 2));
        
        // Create a MIDI file using @tonejs/midi
        const midi = new Midi();
        
        // Add tracks for each generated track
        if (music.tracks && music.tracks.length > 0) {
            music.tracks.forEach(trackData => {
                const track = midi.addTrack();
                track.name = trackData.name;
                
                // Add notes to the track
                if (trackData.notes && trackData.notes.length > 0) {
                    trackData.notes.forEach(note => {
                        track.addNote({
                            midi: note.pitch,
                            time: note.startTime,
                            duration: note.duration,
                            velocity: note.velocity
                        });
                    });
                }
            });
        } else {
            // Fallback: create a single track with chord progression
            const track = midi.addTrack();
            track.name = 'Chord Progression';
            
            // Generate a chord progression based on the prompt
            let chordProgression = ['C', 'Am', 'F', 'G']; // Default progression
            
            // Check if it's a jazz request and use jazz progression
            if (prompt.toLowerCase().includes('jazz')) {
                chordProgression = ['Cmaj7', 'Am7', 'Dm7', 'G7']; // Jazz progression
            }
            const tempo = 120;
            const beatsPerBar = 4;
            const beatDuration = 60 / tempo;
            
            chordProgression.forEach((chord, chordIndex) => {
                const startTime = chordIndex * beatsPerBar * beatDuration;
                const chordNotes = getChordNotes(chord, 4);
                
                chordNotes.forEach((note, noteIndex) => {
                    track.addNote({
                        midi: note,
                        time: startTime + (noteIndex * 0.1),
                        duration: beatsPerBar * beatDuration - (noteIndex * 0.1),
                        velocity: 60 + Math.floor(Math.random() * 20)
                    });
                });
            });
        }
        
        // Save the MIDI file
        const filename = `chord_progression_${Date.now()}.mid`;
        const filePath = path.join(app.getPath('userData'), filename);
        
        // Write the MIDI file
        const midiBuffer = midi.toArray();
        await fsp.writeFile(filePath, Buffer.from(midiBuffer));
        
        console.log(`Chord progression MIDI file created: ${filePath}`);
        
        return {
            success: true,
            filename: filename,
            path: filePath,
            message: 'Chord progression MIDI file generated successfully'
        };
        
    } catch (error) {
        console.error('Error generating chord progression MIDI:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// LLM handler for music generation
ipcMain.handle('llm-run', async (event, { prompt, context = {}, opts = {} }) => {
    try {
        console.log('LLM request received:', { prompt, context, opts });
        
        // Load current settings
        const settings = await loadSettingsFromDisk();
        
        // Check if OpenAI is configured
        if (settings.cloudLlmProvider === 'openai' && settings.apiKey) {
            try {
                // Use the LLM orchestrator for real OpenAI integration
                const { configureLlm, generateLlmResponse } = require('./llm-orchestrator');
                
                // Configure the LLM with current settings
                configureLlm(settings);
                
                // Generate response using OpenAI
                const result = await generateLlmResponse(prompt, null, 'music_generation');
                
                const response = {
                    success: true,
                    data: {
                        prompt: prompt,
                        context: context,
                        generated_content: result.response,
                        sourceFiles: result.sourceFiles || [],
                        metadata: {
                            timestamp: new Date().toISOString(),
                            model: 'gpt-4',
                            provider: 'openai',
                            confidence: 0.85
                        }
                    }
                };
                
                console.log('OpenAI response generated successfully');
                return response;
                
            } catch (openaiError) {
                console.error('OpenAI API error:', openaiError);
                return {
                    success: false,
                    error: `OpenAI API error: ${openaiError.message}`,
                    suggestion: 'Please check your OpenAI API key and internet connection'
                };
            }
        } else {
            // Fallback to simulated response if OpenAI not configured
            console.log('OpenAI not configured, using simulated response');
            const response = {
                success: true,
                data: {
                    prompt: prompt,
                    context: context,
                    generated_content: `Generated music based on: "${prompt}"\n\nNote: Configure OpenAI in Settings to get AI-powered music suggestions.`,
                    metadata: {
                        timestamp: new Date().toISOString(),
                        model: 'simulated-llm',
                        confidence: 0.85
                    }
                }
            };
            
            console.log('LLM response (simulated):', response);
            return response;
        }
        
    } catch (error) {
        console.error('LLM error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// LLM summarize handler
ipcMain.handle('llm-summarize', async (event, { text, options = {} }) => {
    try {
        console.log('LLM summarize request received:', { text: text.substring(0, 100) + '...', options });
        
        // Load current settings
        const settings = await loadSettingsFromDisk();
        
        // Check if OpenAI is configured
        if (settings.cloudLlmProvider === 'openai' && settings.apiKey) {
            try {
                // Use the LLM orchestrator for real OpenAI integration
                const { configureLlm, generateLlmResponse } = require('./llm-orchestrator');
                
                // Configure the LLM with current settings
                configureLlm(settings);
                
                // Create a summarization prompt
                const summarizePrompt = `Please provide a concise summary of the following text and extract the key points:\n\n${text}`;
                
                // Generate summary using OpenAI
                const result = await generateLlmResponse(summarizePrompt, null, 'summarization');
                
                const response = {
                    success: true,
                    data: {
                        original_text: text,
                        summary: result.response,
                        key_points: result.response.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•')),
                        metadata: {
                            timestamp: new Date().toISOString(),
                            model: 'gpt-4',
                            provider: 'openai',
                            confidence: 0.90
                        }
                    }
                };
                
                console.log('OpenAI summarize response generated successfully');
                return response;
                
            } catch (openaiError) {
                console.error('OpenAI API error:', openaiError);
                return {
                    success: false,
                    error: `OpenAI API error: ${openaiError.message}`,
                    suggestion: 'Please check your OpenAI API key and internet connection'
                };
            }
        } else {
            // Fallback to simulated response if OpenAI not configured
            console.log('OpenAI not configured, using simulated summary');
            const response = {
                success: true,
                data: {
                    original_text: text,
                    summary: `Summary: ${text.substring(0, 100)}...\n\nNote: Configure OpenAI in Settings to get AI-powered summaries.`,
                    key_points: [
                        'Key point 1 from the text',
                        'Key point 2 from the text',
                        'Key point 3 from the text'
                    ],
                    metadata: {
                        timestamp: new Date().toISOString(),
                        model: 'simulated-llm',
                        confidence: 0.90
                    }
                }
            };
            
            console.log('LLM summarize response (simulated):', response);
            return response;
        }
        
    } catch (error) {
        console.error('LLM summarize error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle('get-system-status', async () => {
    try {
        const status = await statusSystem.getSystemStatus();
        return status;
    } catch (error) {
        console.error('Failed to get system status:', error);
        return {
            database: { connected: false, error: error.message },
            files: { total: 0, audio: 0, midi: 0 },
        };
    }
});

ipcMain.handle('ask-status-question', async (event, question) => {
    try {
        const answer = await statusSystem.ask(question);
        return answer;
    } catch (error) {
        console.error('Failed to answer status question:', error);
        return "I'm sorry, I encountered an error while trying to answer your question.";
    }
});

ipcMain.handle('get-instrument-counts', async () => {
    return await statusSystem.getInstrumentStatus();
});

ipcMain.handle('analyze-midi-file', async (event, filePath) => {
    try {
        const midiData = await fsp.readFile(filePath);
        const midi = new Midi(midiData);
        const analysis = {
            header: midi.header,
            tracks: midi.tracks.map(track => ({
                name: track.name,
                instrument: track.instrument.name,
                notes: track.notes.length,
            })),
        };
        return { success: true, data: analysis };
    } catch (error) {
        console.error(`Error analyzing MIDI file: ${error.message}`);
        return { success: false, error: error.message };
    }
});

// Audio analysis handler
ipcMain.handle('process-audio-file', async (event, filePath, options = {}) => {
    try {
        // For now, return a basic analysis structure
        // This is where you would integrate actual audio analysis
        const analysis = {
            filePath,
            type: 'audio',
            format: path.extname(filePath).slice(1),
            success: true,
            duration: 0,
            tempo: 120,
            key: 'C',
            energy: 0.5,
            danceability: 0.5,
            valence: 0.5,
            features: {
                spectral_centroid: 0,
                spectral_bandwidth: 0,
                spectral_rolloff: 0,
                zero_crossing_rate: 0,
                mfcc: []
            }
        };
        return analysis;
    } catch (error) {
        console.error(`Error analyzing audio file: ${error.message}`);
        throw new Error(`Failed to process audio file: ${error.message}`);
    }
});
