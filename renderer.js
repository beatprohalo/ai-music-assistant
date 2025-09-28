// renderer.js

// IPC renderer exposed from preload.js
const ipcRenderer = window.ipcRenderer;

let loadedFiles = [];
let appSettings = {};

function logToOLED(message) {
    const oledDisplay = document.querySelector('.oled-display');
    if (!oledDisplay) return;

    let icon = '&gt;';
    if (message.toLowerCase().includes('file') || message.toLowerCase().includes('upload')) icon = '📁';
    else if (message.toLowerCase().includes('training') || message.toLowerCase().includes('train')) icon = '🧠';
    else if (message.toLowerCase().includes('chord') || message.toLowerCase().includes('progression')) icon = '🎵';
    else if (message.toLowerCase().includes('melody') || message.toLowerCase().includes('melodies')) icon = '🎼';
    else if (message.toLowerCase().includes('drum') || message.toLowerCase().includes('drums')) icon = '🥁';
    else if (message.toLowerCase().includes('guitar')) icon = '🎸';
    else if (message.toLowerCase().includes('piano')) icon = '🎹';
    else if (message.toLowerCase().includes('bass')) icon = '🎸';
    else if (message.toLowerCase().includes('string') || message.toLowerCase().includes('strings')) icon = '🎻';
    else if (message.toLowerCase().includes('brass')) icon = '🎺';
    else if (message.toLowerCase().includes('percussion')) icon = '🎪';
    else if (message.toLowerCase().includes('midi')) icon = '🎼';
    else if (message.toLowerCase().includes('audio') || message.toLowerCase().includes('sound')) icon = '🔊';
    else if (message.toLowerCase().includes('ai') || message.toLowerCase().includes('llm')) icon = '🤖';
    else if (message.toLowerCase().includes('database') || message.toLowerCase().includes('db')) icon = '🗄️';
    else if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) icon = '⚠️';
    else if (message.toLowerCase().includes('success') || message.toLowerCase().includes('complete')) icon = '✅';
    else if (message.toLowerCase().includes('loading') || message.toLowerCase().includes('processing') || message.toLowerCase().includes('initializing')) icon = '⏳';

    const currentContent = oledDisplay.innerHTML;
    const lines = currentContent.split('<br>');
    const lastLine = lines[lines.length - 1];
    
    // Remove the "AWAITING INPUT" line to append the new message
    let newContent = lines.slice(0, lines.length -1).join('<br>');
    newContent += `<br>${icon} ${message}`;
    oledDisplay.innerHTML = newContent;
    
    // Add the "AWAITING INPUT" line back after a delay
    setTimeout(() => {
        oledDisplay.innerHTML = newContent + '<br>' + lastLine;
        oledDisplay.scrollTop = oledDisplay.scrollHeight;
    }, 1500);
}

function updateStatusDisplay() {
    const aiStatus = document.getElementById('ai-status');
    const dbStatus = document.getElementById('db-status');
    const filesStatus = document.getElementById('files-status');
    
    if (aiStatus) aiStatus.textContent = 'READY';
    if (dbStatus) dbStatus.textContent = 'CONNECTED';
    if (filesStatus) filesStatus.textContent = loadedFiles.length.toString();
}

async function handleGeneration(generationType) {
    const musicalPromptInput = document.getElementById('musicalPromptInput');
    const prompt = musicalPromptInput.value.trim();

    if (!prompt) {
        logToOLED('Please enter a musical prompt.');
        return;
    }

    let targetButton;
    if (generationType === 'humanize') targetButton = document.querySelector('.generate-humanize');
    else if (generationType === 'midi') targetButton = document.querySelector('.generate-midi');
    else if (generationType === 'both') targetButton = document.querySelector('.generate-both');

    if (targetButton) {
        targetButton.disabled = true;
        targetButton.textContent = 'PROCESSING...';
    }

    try {
        const result = await ipcRenderer.invoke('handle-generation', { generationType, prompt });

        if (result.success && result.generatedPath) {
            const lastGen = document.getElementById('last-gen');
            if (lastGen) lastGen.textContent = result.generatedPath;
        } else if (!result.success) {
            logToOLED(`Error: ${result.error}`);
        }
    } catch (error) {
        logToOLED(`Error: ${error.message}`);
        console.error('Generation Error:', error);
    }

    if (targetButton) {
        targetButton.disabled = false;
        targetButton.textContent = `GENERATE ${generationType.toUpperCase()}`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Listen for log messages from the main process
    ipcRenderer.on('log-to-oled', (message) => {
        logToOLED(message);
    });

    // Initialize the backend and get app state
    const initialState = await ipcRenderer.invoke('initialize-app');
    if (initialState.success) {
        loadedFiles = initialState.files || [];
        appSettings = initialState.settings || {};
        updateStatusDisplay();
    } else {
        logToOLED(`Failed to initialize app: ${initialState.error}`);
    }

    // --- Event Listeners ---
    const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
    if (toggleSettingsBtn) {
        toggleSettingsBtn.addEventListener('click', () => ipcRenderer.invoke('open-settings-window'));
    }

    const generateHumanizeBtn = document.querySelector('.generate-humanize');
    const generateMidiBtn = document.querySelector('.generate-midi');
    const generateBothBtn = document.querySelector('.generate-both');

    if (generateHumanizeBtn) generateHumanizeBtn.addEventListener('click', () => handleGeneration('humanize'));
    if (generateMidiBtn) generateMidiBtn.addEventListener('click', () => handleGeneration('midi'));
    if (generateBothBtn) generateBothBtn.addEventListener('click', () => handleGeneration('both'));
    
    const testUploadBtn = document.getElementById('test-upload-btn');
    if (testUploadBtn) {
        testUploadBtn.addEventListener('click', () => ipcRenderer.invoke('open-test-window'));
    }

    const testSettingsBtn = document.getElementById('test-settings-btn');
    if (testSettingsBtn) {
        testSettingsBtn.addEventListener('click', () => ipcRenderer.invoke('open-settings-test-window'));
    }
});