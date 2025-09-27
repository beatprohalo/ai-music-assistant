// renderer.js
const path = require('path');
const fs = require('fs');
const { ipcRenderer } = require('electron');
const mlEngine = require('./ml-engine');
const llmOrchestrator = require('./llm-orchestrator');
const midiAnalyzer = require('./midi-analyzer');
const audioAnalyzer = require('./audio-analyzer');
const featureExtractor = require('./feature-extractor');
const vectorDB = require('./vector-database');
const midiGenerator = require('./midi-generator');

// Get user data path from additionalArguments passed from main.js
const userDataPath = process.argv.find(arg => arg.startsWith('--user-data-path=')).split('=')[1];
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
        logToOLED('App state saved successfully.');
    } catch (error) {
        console.error('Failed to save app state:', error);
        logToOLED('Error: Failed to save app state.');
    }
}

async function loadAppState() {
    try {
        if (fs.existsSync(dataFilePath)) {
            const data = await fs.promises.readFile(dataFilePath, 'utf8');
            loadedFiles = JSON.parse(data);
            logToOLED(`Loaded ${loadedFiles.length} files from storage.`);
        } else {
            logToOLED('No previous file data found.');
        }
        
        if (fs.existsSync(settingsFilePath)) {
            const settings = await fs.promises.readFile(settingsFilePath, 'utf8');
            appSettings = { ...appSettings, ...JSON.parse(settings) };
            logToOLED('Loaded settings from storage.');
        } else {
            logToOLED('No previous settings found.');
        }
    } catch (error) {
        console.error('Failed to load app state:', error);
        logToOLED('Error: Failed to load app state.');
    }
}

function logToOLED(message) {
    const oledDisplay = document.querySelector('.oled-display');
    if (!oledDisplay) return;
    
    // Add appropriate icon based on message content
    let icon = '&gt;';
    if (message.toLowerCase().includes('file') || message.toLowerCase().includes('upload')) {
        icon = '📁';
    } else if (message.toLowerCase().includes('training') || message.toLowerCase().includes('train')) {
        icon = '🧠';
    } else if (message.toLowerCase().includes('chord') || message.toLowerCase().includes('progression')) {
        icon = '🎵';
    } else if (message.toLowerCase().includes('melody') || message.toLowerCase().includes('melodies')) {
        icon = '🎼';
    } else if (message.toLowerCase().includes('drum') || message.toLowerCase().includes('drums')) {
        icon = '🥁';
    } else if (message.toLowerCase().includes('guitar')) {
        icon = '🎸';
    } else if (message.toLowerCase().includes('piano')) {
        icon = '🎹';
    } else if (message.toLowerCase().includes('bass')) {
        icon = '🎸';
    } else if (message.toLowerCase().includes('string') || message.toLowerCase().includes('strings')) {
        icon = '🎻';
    } else if (message.toLowerCase().includes('brass')) {
        icon = '🎺';
    } else if (message.toLowerCase().includes('percussion')) {
        icon = '🎪';
    } else if (message.toLowerCase().includes('midi')) {
        icon = '🎼';
    } else if (message.toLowerCase().includes('audio') || message.toLowerCase().includes('sound')) {
        icon = '🔊';
    } else if (message.toLowerCase().includes('ai') || message.toLowerCase().includes('llm')) {
        icon = '🤖';
    } else if (message.toLowerCase().includes('database') || message.toLowerCase().includes('db')) {
        icon = '🗄️';
    } else if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
        icon = '⚠️';
    } else if (message.toLowerCase().includes('success') || message.toLowerCase().includes('complete')) {
        icon = '✅';
    } else if (message.toLowerCase().includes('loading') || message.toLowerCase().includes('processing')) {
        icon = '⏳';
    }
    
    const currentContent = oledDisplay.innerHTML;
    const lines = currentContent.split('<br>');
    const existingStatusLines = lines.slice(0, lines.length - 2).join('<br>');
    const currentPromptLine = '&gt; AWAITING INPUT . . .';
    
    let combinedContent = oledDisplay.innerHTML.replace(currentPromptLine, '');
    combinedContent += `<br>${icon} ${message}`;
    oledDisplay.innerHTML = combinedContent;
    
    setTimeout(() => {
        oledDisplay.innerHTML = combinedContent + '<br>' + currentPromptLine;
        oledDisplay.scrollTop = oledDisplay.scrollHeight;
    }, 2000);
}

function updateStatusDisplay() {
    const aiStatus = document.getElementById('ai-status');
    const dbStatus = document.getElementById('db-status');
    const filesStatus = document.getElementById('files-status');
    const lastGen = document.getElementById('last-gen');
    
    if (aiStatus) aiStatus.textContent = 'READY';
    if (dbStatus) dbStatus.textContent = 'CONNECTED';
    if (filesStatus) filesStatus.textContent = loadedFiles.length.toString();
    if (lastGen) lastGen.textContent = 'NONE';
}

function generateQueryVector(prompt, files) {
    // Generate a query vector based on prompt and loaded files
    const vector = Array.from({length: 6}, () => Math.random());
    
    // Add context from loaded files
    if (files && files.length > 0) {
        const midiFiles = files.filter(f => f.type === 'midi').length;
        const audioFiles = files.filter(f => f.type === 'audio').length;
        
        // Adjust vector based on file types
        vector[0] = midiFiles / Math.max(files.length, 1);
        vector[1] = audioFiles / Math.max(files.length, 1);
    }
    
    return vector;
}

async function handleGeneration(generationType) {
    const musicalPromptInput = document.getElementById('musicalPromptInput');
    const prompt = musicalPromptInput.value.trim();
    
    if (!prompt) {
        logToOLED('Please enter a musical prompt.');
        return;
    }
    
    // Get the appropriate button
    let targetButton;
    if (generationType === 'humanize') {
        targetButton = document.querySelector('.generate-humanize');
    } else if (generationType === 'midi') {
        targetButton = document.querySelector('.generate-midi');
    } else if (generationType === 'both') {
        targetButton = document.querySelector('.generate-both');
    }
    
    // Disable buttons while processing
    if (targetButton) {
        targetButton.disabled = true;
        targetButton.textContent = 'PROCESSING...';
    }
    
    logToOLED(`LLM Request for ${generationType.toUpperCase()}: "${prompt}"`);
    
    try {
        // Check if we have loaded files for context
        if (loadedFiles.length === 0) {
            logToOLED('⚠️ No files loaded. Upload some MIDI/audio files for better results.');
        }
        
        // Generate query vector from prompt and loaded files
        const queryVector = generateQueryVector(prompt, loadedFiles);
        
        // Get LLM response with context
        const { response: llmResponse, sourceFiles } = await llmOrchestrator.generateLlmResponse(prompt, queryVector, generationType === 'humanize' ? 'humanization' : 'pattern');
        
        let fullLog = `LLM Response (${generationType.toUpperCase()}): ${llmResponse}`;
        if (sourceFiles && sourceFiles.length > 0) {
            fullLog += `\n  - Referenced files: ${sourceFiles.map(s => path.basename(s)).join(', ')}`;
        }
        logToOLED(fullLog);
        
        if (generationType === 'midi' || generationType === 'both') {
            logToOLED('Attempting to generate MIDI...');
            try {
                const outputDir = path.join(userDataPath, 'HumanizerAI', 'generated');
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                const outputFilePath = path.join(outputDir, `generated_midi_${Date.now()}.mid`);
                const generatedPath = await midiGenerator.generateMidiFromLLMResponse(llmResponse, outputFilePath);
                logToOLED(`MIDI generated successfully: ${path.basename(generatedPath)}`);
                
                // Update last generation status
                const lastGen = document.getElementById('last-gen');
                if (lastGen) lastGen.textContent = path.basename(generatedPath);
            } catch (error) {
                logToOLED(`Error generating MIDI: ${error.message}`);
                console.error('MIDI Generation Error:', error);
            }
        }
        
    } catch (error) {
        logToOLED(`Error: ${error.message}`);
        console.error('Generation Error:', error);
    }
    
    // Re-enable buttons
    if (targetButton) {
        targetButton.disabled = false;
        targetButton.textContent = `GENERATE ${generationType.toUpperCase()}`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadAppState();
    
    // --- Toggle Settings Button ---
    const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
    if (toggleSettingsBtn) {
        toggleSettingsBtn.addEventListener('click', async () => {
            try {
                await ipcRenderer.invoke('open-settings-window');
                logToOLED('Settings window opened.');
            } catch (error) {
                logToOLED(`Error opening settings: ${error.message}`);
                console.error('Settings window error:', error);
            }
        });
    }
    
    logToOLED('Initializing ML models...');
    const basicPitch = await mlEngine.loadBasicPitchModel();
    const humanizer = await mlEngine.loadHumanizerModel();
    if (basicPitch && humanizer) {
        logToOLED('All ML models ready.');
    } else {
        logToOLED('Warning: Some ML models failed to load.');
    }
    
    logToOLED('Initializing Vector Database...');
    const dbStatus = await vectorDB.initVectorDatabase();
    if (dbStatus) {
        logToOLED('Vector Database ready.');
    } else {
        logToOLED('Error: Vector Database failed to initialize.');
    }
    
    // Configure LLM Orchestrator
    llmOrchestrator.configureLlm(appSettings);
    
    // Update status display
    updateStatusDisplay();
    
    // Generation button event listeners
    const generateHumanizeBtn = document.querySelector('.generate-humanize');
    const generateMidiBtn = document.querySelector('.generate-midi');
    const generateBothBtn = document.querySelector('.generate-both');
    
    if (generateHumanizeBtn) {
        generateHumanizeBtn.addEventListener('click', () => handleGeneration('humanize'));
    }
    if (generateMidiBtn) {
        generateMidiBtn.addEventListener('click', () => handleGeneration('midi'));
    }
    if (generateBothBtn) {
        generateBothBtn.addEventListener('click', () => handleGeneration('both'));
    }
    
    // Test upload button
    const testUploadBtn = document.getElementById('test-upload-btn');
    if (testUploadBtn) {
        testUploadBtn.addEventListener('click', async () => {
            try {
                await ipcRenderer.invoke('open-test-window');
            } catch (error) {
                console.error('Failed to open test window:', error);
            }
        });
    }
    
    // Test settings button
    const testSettingsBtn = document.getElementById('test-settings-btn');
    if (testSettingsBtn) {
        testSettingsBtn.addEventListener('click', async () => {
            try {
                await ipcRenderer.invoke('open-settings-test-window');
            } catch (error) {
                console.error('Failed to open settings test window:', error);
            }
        });
    }
});