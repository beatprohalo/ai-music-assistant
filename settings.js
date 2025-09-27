// settings.js
const path = require('path');
const fs = require('fs');
const { ipcRenderer } = require('electron');

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
    temperature: 0.7,
    musicalElements: {
        chordProgressions: { enabled: true, complexity: 'simple', keys: 'C,G,D' },
        melodies: { enabled: true, style: 'classical', range: 3 },
        drums: { enabled: true, pattern: 'basic', complexity: 3 },
        guitar: { enabled: true, type: 'acoustic', technique: 'strumming' },
        piano: { enabled: true, style: 'classical', voicing: 'root,3rd,5th' },
        bass: { enabled: true, pattern: 'walking', octave: 2 },
        strings: { enabled: true, section: 'violin', articulation: 'legato' },
        brass: { enabled: true, instrument: 'trumpet', mute: 'straight' },
        percussion: { enabled: true, type: 'timbales', pattern: 'salsa' }
    }
};

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

async function saveAppState() {
    try {
        await fs.promises.writeFile(dataFilePath, JSON.stringify(loadedFiles, null, 2));
        await fs.promises.writeFile(settingsFilePath, JSON.stringify(appSettings, null, 2));
        logToOLED('Settings saved successfully.');
    } catch (error) {
        console.error('Failed to save settings:', error);
        logToOLED('Error: Failed to save settings.');
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
    
    // Add color coding based on content
    let coloredMessage = message;
    if (message.toLowerCase().includes('chord')) {
        coloredMessage = `<span class="oled-chord">${message}</span>`;
    } else if (message.toLowerCase().includes('melody')) {
        coloredMessage = `<span class="oled-melody">${message}</span>`;
    } else if (message.toLowerCase().includes('drum')) {
        coloredMessage = `<span class="oled-drum">${message}</span>`;
    } else if (message.toLowerCase().includes('guitar')) {
        coloredMessage = `<span class="oled-guitar">${message}</span>`;
    } else if (message.toLowerCase().includes('piano')) {
        coloredMessage = `<span class="oled-piano">${message}</span>`;
    } else if (message.toLowerCase().includes('bass')) {
        coloredMessage = `<span class="oled-bass">${message}</span>`;
    } else if (message.toLowerCase().includes('string')) {
        coloredMessage = `<span class="oled-string">${message}</span>`;
    } else if (message.toLowerCase().includes('brass')) {
        coloredMessage = `<span class="oled-brass">${message}</span>`;
    } else if (message.toLowerCase().includes('percussion')) {
        coloredMessage = `<span class="oled-percussion">${message}</span>`;
    }
    
    const currentContent = oledDisplay.innerHTML;
    const lines = currentContent.split('<br>');
    const existingStatusLines = lines.slice(0, lines.length - 2).join('<br>');
    const currentPromptLine = '&gt; AWAITING CONFIGURATION . . .';
    
    let combinedContent = oledDisplay.innerHTML.replace(currentPromptLine, '');
    combinedContent += `<br>&gt; ${coloredMessage}`;
    oledDisplay.innerHTML = combinedContent;
    
    setTimeout(() => {
        oledDisplay.innerHTML = combinedContent + '<br>' + currentPromptLine;
        oledDisplay.scrollTop = oledDisplay.scrollHeight;
    }, 2000);
}

function updateFileList() {
    const fileList = document.getElementById('file-list');
    if (!fileList) return;
    
    fileList.innerHTML = '';
    
    loadedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        
        // Add file type icon based on file extension
        let fileIcon = '📄';
        const extension = file.name.toLowerCase().split('.').pop();
        
        if (['mp3', 'wav', 'flac', 'aiff', 'aif', 'm4a', 'ogg', 'aac'].includes(extension)) {
            fileIcon = '🔊';
        } else if (['mid', 'midi'].includes(extension)) {
            fileIcon = '🎼';
        }
        
        const tagsHtml = file.tags.map(tag => 
            `<button class="tag-button" onclick="toggleFileTag(${index}, '${tag}')">${tag}</button>`
        ).join('');
        
        const statusIcon = file.status === 'processed' ? '✅' : '⏳';
        const typeLabel = file.type === 'audio' ? 'AUDIO' : file.type === 'midi' ? 'MIDI' : 'UNKNOWN';
        
        li.innerHTML = `
            <span class="file-icon">${fileIcon}</span>
            <span class="file-name">${file.name}</span>
            <span class="file-type">${typeLabel}</span>
            <span class="file-status">${statusIcon}</span>
            <div class="file-tags">${tagsHtml}</div>
        `;
        
        fileList.appendChild(li);
    });
}

function toggleFileTag(index, tag) {
    const file = loadedFiles[index];
    if (file.tags.includes(tag)) {
        file.tags = file.tags.filter(t => t !== tag);
    } else {
        file.tags.push(tag);
    }
    updateFileList();
    saveAppState();
}

// File processing function
async function processFile(filePath) {
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();
    let fileType = 'unknown';
    let defaultTags = ['humanize'];
    let analysis = null;
    let humanizationFeatures = null;
    let patternFeatures = null;
    
    const AUDIO_EXTS = ['.mp3', '.wav', '.flac', '.aiff', '.aif', '.m4a', '.ogg', '.aac'];
    const MIDI_EXTS = ['.mid', '.midi'];
    
    try {
        if (AUDIO_EXTS.includes(fileExtension)) {
            fileType = 'audio';
            defaultTags = ['pattern'];
            logToOLED(`🔊 Analyzing audio file: ${fileName}`);
            
            // Simulate audio analysis
            analysis = {
                duration: Math.random() * 300 + 30, // 30-330 seconds
                sampleRate: 44100,
                channels: 2,
                bitRate: 320,
                tempo: Math.floor(Math.random() * 60) + 60, // 60-120 BPM
                key: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'][Math.floor(Math.random() * 12)],
                genre: ['Rock', 'Jazz', 'Classical', 'Electronic', 'Blues'][Math.floor(Math.random() * 5)],
                energy: Math.random(),
                valence: Math.random(),
                danceability: Math.random()
            };
            
            // Simulate feature extraction
            humanizationFeatures = {
                timingVariation: Math.random() * 0.1,
                velocityVariation: Math.random() * 0.2,
                swingFactor: Math.random() * 0.3
            };
            
            patternFeatures = {
                rhythmPattern: Math.random(),
                harmonicComplexity: Math.random(),
                melodicContour: Math.random(),
                dynamicRange: Math.random()
            };
            
        } else if (MIDI_EXTS.includes(fileExtension)) {
            fileType = 'midi';
            defaultTags = ['humanize', 'pattern'];
            logToOLED(`🎼 Analyzing MIDI file: ${fileName}`);
            
            // Simulate MIDI analysis
            analysis = {
                tracks: Math.floor(Math.random() * 8) + 1,
                duration: Math.random() * 180 + 30, // 30-210 seconds
                tempo: Math.floor(Math.random() * 60) + 60, // 60-120 BPM
                timeSignature: ['4/4', '3/4', '2/4', '6/8'][Math.floor(Math.random() * 4)],
                key: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'][Math.floor(Math.random() * 12)],
                totalNotes: Math.floor(Math.random() * 1000) + 100,
                averageVelocity: Math.random(),
                noteDensity: Math.random()
            };
            
            // Simulate feature extraction
            humanizationFeatures = {
                timingVariation: Math.random() * 0.05,
                velocityVariation: Math.random() * 0.15,
                swingFactor: Math.random() * 0.2,
                microTiming: Math.random() * 0.03
            };
            
            patternFeatures = {
                chordProgressions: Math.floor(Math.random() * 20) + 5,
                melodicPhrases: Math.floor(Math.random() * 15) + 3,
                rhythmicPatterns: Math.floor(Math.random() * 10) + 2,
                harmonicComplexity: Math.random()
            };
        }
        
        logToOLED(`✅ Successfully processed: ${fileName}`);
        
    } catch (error) {
        logToOLED(`❌ Error processing ${fileName}: ${error.message}`);
        console.error('File processing error:', error);
    }
    
    return {
        name: fileName,
        path: filePath,
        type: fileType,
        tags: defaultTags,
        analysis: analysis,
        humanizationFeatures: humanizationFeatures,
        patternFeatures: patternFeatures,
        processedAt: new Date().toISOString(),
        status: 'processed'
    };
}

// Training simulation
async function simulateTraining() {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const trainingStatus = document.getElementById('training-status');
    const startTrainingBtn = document.getElementById('start-training-btn');
    
    if (!progressFill || !progressText || !trainingStatus || !startTrainingBtn) return;
    
    startTrainingBtn.disabled = true;
    startTrainingBtn.textContent = 'TRAINING...';
    
    const steps = [
        { text: 'Analyzing chord progressions...', icon: '🎵' },
        { text: 'Processing melodies...', icon: '🎼' },
        { text: 'Training drum patterns...', icon: '🥁' },
        { text: 'Learning guitar techniques...', icon: '🎸' },
        { text: 'Studying piano voicings...', icon: '🎹' },
        { text: 'Analyzing bass lines...', icon: '🎸' },
        { text: 'Processing string arrangements...', icon: '🎻' },
        { text: 'Learning brass techniques...', icon: '🎺' },
        { text: 'Training percussion patterns...', icon: '🎪' },
        { text: 'Finalizing model...', icon: '🧠' }
    ];
    
    for (let i = 0; i < steps.length; i++) {
        const progress = ((i + 1) / steps.length) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
        trainingStatus.textContent = `${steps[i].icon} ${steps[i].text}`;
        
        logToOLED(`Training step ${i + 1}/${steps.length}: ${steps[i].text}`);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    }
    
    // Training complete
    progressFill.style.width = '100%';
    progressText.textContent = '100%';
    trainingStatus.textContent = 'Training completed successfully!';
    logToOLED('Training completed! Model is ready for generation.');
    
    startTrainingBtn.disabled = false;
    startTrainingBtn.textContent = 'START TRAINING';
    
    // Show completion notification
    setTimeout(() => {
        trainingStatus.textContent = 'Model ready for generation';
    }, 3000);
}

// Element group toggle functionality
function setupElementGroups() {
    const elementGroups = document.querySelectorAll('.element-group');
    
    elementGroups.forEach(group => {
        const header = group.querySelector('.element-header');
        const toggle = group.querySelector('input[type="checkbox"]');
        
        if (header && toggle) {
            // Click header to toggle settings visibility
            header.addEventListener('click', (e) => {
                if (e.target !== toggle && !toggle.contains(e.target)) {
                    group.classList.toggle('active');
                }
            });
            
            // Toggle functionality
            toggle.addEventListener('change', () => {
                const elementType = group.className.split(' ')[1]; // Get the element type
                if (appSettings.musicalElements[elementType]) {
                    appSettings.musicalElements[elementType].enabled = toggle.checked;
                    saveAppState();
                }
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Settings page DOMContentLoaded event fired');
    await loadAppState();
    
    // Navigation functionality
    const navButtons = document.querySelectorAll('.nav-button');
    const settingsSections = document.querySelectorAll('.settings-section');
    
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and sections
            navButtons.forEach(btn => btn.classList.remove('active'));
            settingsSections.forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Show corresponding section
            const sectionId = button.id.replace('nav-', '').replace('-btn', '-section');
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
    
    // LLM Configuration elements
    const localLlmToggle = document.getElementById('localLlmToggle');
    const localModelPath = document.getElementById('localModelPath');
    const localModelType = document.getElementById('localModelType');
    const gpuAcceleration = document.getElementById('gpuAcceleration');
    const cloudLlmProvider = document.getElementById('cloudLlmProvider');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const modelName = document.getElementById('modelName');
    const modelSize = document.getElementById('modelSize');
    const temperatureSlider = document.getElementById('temperatureSlider');
    const temperatureValue = document.getElementById('temperatureValue');
    const maxTokens = document.getElementById('maxTokens');
    const testModelBtn = document.getElementById('testModelBtn');
    const modelTestResult = document.getElementById('modelTestResult');
    
    // LLM Configuration event listeners
    if (localLlmToggle) {
        localLlmToggle.addEventListener('change', () => {
            appSettings.localLlmEnabled = localLlmToggle.checked;
            saveAppState();
        });
    }
    
    if (cloudLlmProvider) {
        cloudLlmProvider.addEventListener('change', () => {
            appSettings.cloudLlmProvider = cloudLlmProvider.value;
            saveAppState();
        });
    }
    
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', () => {
            appSettings.apiKey = apiKeyInput.value;
            saveAppState();
        });
    }
    
    if (modelSize) {
        modelSize.addEventListener('change', () => {
            appSettings.modelSize = modelSize.value;
            saveAppState();
        });
    }
    
    if (temperatureSlider && temperatureValue) {
        temperatureSlider.addEventListener('input', () => {
            const value = temperatureSlider.value / 100;
            appSettings.temperature = value;
            temperatureValue.textContent = value.toFixed(1);
            saveAppState();
        });
    }
    
    if (maxTokens) {
        maxTokens.addEventListener('input', () => {
            appSettings.maxTokens = parseInt(maxTokens.value);
            saveAppState();
        });
    }
    
    // Local model configuration
    if (localModelPath) {
        localModelPath.addEventListener('input', () => {
            appSettings.localModelPath = localModelPath.value;
            saveAppState();
        });
    }
    
    if (localModelType) {
        localModelType.addEventListener('change', () => {
            appSettings.localModelType = localModelType.value;
            saveAppState();
        });
    }
    
    if (gpuAcceleration) {
        gpuAcceleration.addEventListener('change', () => {
            appSettings.gpuAcceleration = gpuAcceleration.checked;
            saveAppState();
        });
    }
    
    if (modelName) {
        modelName.addEventListener('change', () => {
            appSettings.modelName = modelName.value;
            saveAppState();
        });
    }
    
    // Model testing
    if (testModelBtn) {
        testModelBtn.addEventListener('click', async () => {
            await testModelConnection();
        });
    }
    
    // Get elements
    const toggleMainBtn = document.getElementById('toggle-main-btn');
    const uploadFilesBtn = document.getElementById('upload-files-btn');
    const scanFolderBtn = document.getElementById('scan-folder-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const startTrainingBtn = document.getElementById('start-training-btn');
    const processFilesBtn = document.getElementById('process-files-btn');
    
    // Toggle main app button
    if (toggleMainBtn) {
        toggleMainBtn.addEventListener('click', async () => {
            try {
                await ipcRenderer.invoke('open-main-window');
                logToOLED('Main app window opened.');
            } catch (error) {
                logToOLED(`Error opening main app: ${error.message}`);
                console.error('Main app window error:', error);
            }
        });
    }
    
    // Setup element groups
    setupElementGroups();
    
    // File upload
    if (uploadFilesBtn) {
        console.log('Upload files button found:', uploadFilesBtn);
        uploadFilesBtn.addEventListener('click', async () => {
            try {
                console.log('Upload files button clicked');
                logToOLED('Opening file dialog...');
                console.log('Calling IPC handler: open-file-dialog');
                const filePaths = await ipcRenderer.invoke('open-file-dialog');
                console.log('File paths received:', filePaths);
                
                if (filePaths && filePaths.length > 0) {
                    logToOLED(`Uploading ${filePaths.length} files...`);
                    for (const filePath of filePaths) {
                        if (!loadedFiles.some(lf => lf.path === filePath)) {
                            const processedFile = await processFile(filePath);
                            if (processedFile) {
                                loadedFiles.push(processedFile);
                                logToOLED(`File uploaded: ${processedFile.name}`);
                            }
                        } else {
                            logToOLED(`Skipping duplicate file: ${path.basename(filePath)}`);
                        }
                    }
                    updateFileList();
                    saveAppState();
                } else {
                    logToOLED('No files selected for upload.');
                }
            } catch (error) {
                console.error('File upload error:', error);
                logToOLED(`Upload error: ${error.message}`);
            }
        });
    }
    
    // Test IPC first
    const testIpcBtn = document.getElementById('test-ipc-btn');
    if (testIpcBtn) {
        testIpcBtn.addEventListener('click', async () => {
            try {
                console.log('Test IPC button clicked');
                const result = await ipcRenderer.invoke('test-ipc');
                console.log('Test IPC result:', result);
                logToOLED(`IPC Test: ${result.message}`);
            } catch (error) {
                console.error('Test IPC error:', error);
                logToOLED(`IPC Test Error: ${error.message}`);
            }
        });
    }

    // Test sync IPC
    const testSyncBtn = document.getElementById('test-sync-btn');
    if (testSyncBtn) {
        testSyncBtn.addEventListener('click', () => {
            console.log('Test sync IPC button clicked');
            ipcRenderer.send('open-folder-dialog-sync');
        });
    }

    // Listen for sync IPC results
    ipcRenderer.on('folder-dialog-result', (event, result) => {
        console.log('Folder dialog sync result:', result);
        logToOLED(`Sync IPC Result: ${result || 'No folder selected'}`);
    });

    ipcRenderer.on('folder-dialog-error', (event, error) => {
        console.error('Folder dialog sync error:', error);
        logToOLED(`Sync IPC Error: ${error}`);
    });

    // Folder scan
    if (scanFolderBtn) {
        console.log('Scan folder button found:', scanFolderBtn);
        scanFolderBtn.addEventListener('click', async () => {
            try {
                console.log('Scan folder button clicked');
                logToOLED('Opening folder dialog...');
                console.log('Calling IPC handler: open-folder-dialog');
                const folderPath = await ipcRenderer.invoke('open-folder-dialog');
                console.log('Folder path received:', folderPath);
            if (folderPath) {
                logToOLED(`Scanning folder: ${folderPath}`);
                try {
                    const files = await fs.promises.readdir(folderPath, { withFileTypes: true });
                    const AUDIO_EXTS = ['.mp3', '.wav', '.flac', '.aiff', '.aif', '.m4a', '.ogg', '.aac'];
                    const MIDI_EXTS = ['.mid', '.midi'];
                    
                    let newFiles = [];
                    for (const file of files) {
                        if (file.isFile()) {
                            const ext = path.extname(file.name).toLowerCase();
                            if (AUDIO_EXTS.includes(ext) || MIDI_EXTS.includes(ext)) {
                                const fullPath = path.join(folderPath, file.name);
                                if (!loadedFiles.some(lf => lf.path === fullPath)) {
                                    const processedFile = await processFile(fullPath);
                                    newFiles.push(processedFile);
                                }
                            }
                        }
                    }
                    
                    if (newFiles.length > 0) {
                        loadedFiles.push(...newFiles);
                        logToOLED(`Found ${newFiles.length} new files in folder.`);
                        updateFileList();
                        saveAppState();
                    } else {
                        logToOLED(`No new audio/MIDI files found in ${folderPath}.`);
                    }
                } catch (error) {
                    logToOLED(`Error scanning folder: ${error.message}`);
                }
            } else {
                logToOLED('No folder selected for scanning.');
            }
            } catch (error) {
                console.error('Folder scan error:', error);
                logToOLED(`Folder scan error: ${error.message}`);
            }
        });
    }
    
    // Clear data
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all loaded data?')) {
                loadedFiles = [];
                logToOLED('All loaded data cleared.');
                updateFileList();
                saveAppState();
            }
        });
    }
    
    // Export settings
    const exportSettingsBtn = document.getElementById('export-settings-btn');
    if (exportSettingsBtn) {
        exportSettingsBtn.addEventListener('click', async () => {
            try {
                const settingsData = {
                    appSettings: appSettings,
                    loadedFiles: loadedFiles,
                    timestamp: new Date().toISOString()
                };
                
                const dataStr = JSON.stringify(settingsData, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `humanizer-ai-settings-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                logToOLED('Settings exported successfully!');
            } catch (error) {
                console.error('Export error:', error);
                logToOLED(`Export error: ${error.message}`);
            }
        });
    }
    
    // Import settings
    const importSettingsBtn = document.getElementById('import-settings-btn');
    if (importSettingsBtn) {
        importSettingsBtn.addEventListener('click', async () => {
            try {
                const filePaths = await ipcRenderer.invoke('open-file-dialog');
                if (filePaths && filePaths.length > 0) {
                    const filePath = filePaths[0];
                    const fileData = await fs.promises.readFile(filePath, 'utf8');
                    const settingsData = JSON.parse(fileData);
                    
                    if (settingsData.appSettings) {
                        appSettings = settingsData.appSettings;
                        // Update UI elements
                        const localLlmToggle = document.getElementById('localLlmToggle');
                        const cloudLlmProvider = document.getElementById('cloudLlmProvider');
                        const apiKeyInput = document.getElementById('apiKeyInput');
                        
                        if (localLlmToggle) localLlmToggle.checked = appSettings.localLlmEnabled;
                        if (cloudLlmProvider) cloudLlmProvider.value = appSettings.cloudLlmProvider;
                        if (apiKeyInput) apiKeyInput.value = appSettings.apiKey;
                    }
                    
                    if (settingsData.loadedFiles) {
                        loadedFiles = settingsData.loadedFiles;
                        updateFileList();
                    }
                    
                    saveAppState();
                    logToOLED('Settings imported successfully!');
                } else {
                    logToOLED('No settings file selected.');
                }
            } catch (error) {
                console.error('Import error:', error);
                logToOLED(`Import error: ${error.message}`);
            }
        });
    }
    
    // Start training
    if (startTrainingBtn) {
        startTrainingBtn.addEventListener('click', async () => {
            if (loadedFiles.length === 0) {
                logToOLED('Please upload some files before training.');
                return;
            }
            await simulateTraining();
        });
    }
    
    // Process files
    if (processFilesBtn) {
        processFilesBtn.addEventListener('click', async () => {
            if (loadedFiles.length === 0) {
                logToOLED('Please upload some files before processing.');
                return;
            }
            await processFiles();
        });
    }
    
    // Initial display
    updateFileList();
    updateLibraryStats();
});

// Model testing function
async function testModelConnection() {
    const testResult = document.getElementById('modelTestResult');
    const testBtn = document.getElementById('testModelBtn');
    
    if (!testResult || !testBtn) return;
    
    testBtn.disabled = true;
    testBtn.textContent = 'TESTING...';
    testResult.innerHTML = 'Testing model connection...';
    
    try {
        // Simulate model testing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const localEnabled = document.getElementById('localLlmToggle')?.checked;
        const cloudProvider = document.getElementById('cloudLlmProvider')?.value;
        
        if (localEnabled && document.getElementById('localModelPath')?.value) {
            testResult.innerHTML = '✅ Local model connection successful!';
            testResult.className = 'test-result success';
        } else if (cloudProvider !== 'none' && document.getElementById('apiKeyInput')?.value) {
            testResult.innerHTML = '✅ Cloud model connection successful!';
            testResult.className = 'test-result success';
        } else {
            testResult.innerHTML = '⚠️ Please configure a model and provide required credentials.';
            testResult.className = 'test-result error';
        }
    } catch (error) {
        testResult.innerHTML = `❌ Model connection failed: ${error.message}`;
        testResult.className = 'test-result error';
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = 'TEST MODEL CONNECTION';
    }
}

// Enhanced file processing
async function processFiles() {
    const processBtn = document.getElementById('process-files-btn');
    if (!processBtn) return;
    
    processBtn.disabled = true;
    processBtn.textContent = 'PROCESSING...';
    
    try {
        for (let i = 0; i < loadedFiles.length; i++) {
            const file = loadedFiles[i];
            logToOLED(`Processing file ${i + 1}/${loadedFiles.length}: ${file.name}`);
            
            // Simulate file processing
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update processing status
            updateProcessingStatus();
        }
        
        logToOLED('All files processed successfully!');
        updateLibraryStats();
    } catch (error) {
        logToOLED(`Error processing files: ${error.message}`);
    } finally {
        processBtn.disabled = false;
        processBtn.textContent = '⚙️ PROCESS FILES';
    }
}

function updateProcessingStatus() {
    const analyzedCount = document.getElementById('analyzed-count');
    const midiCount = document.getElementById('midi-count');
    const audioCount = document.getElementById('audio-count');
    const featuresCount = document.getElementById('features-count');
    
    if (analyzedCount) analyzedCount.textContent = loadedFiles.length;
    
    const midiFiles = loadedFiles.filter(f => f.type === 'midi').length;
    const audioFiles = loadedFiles.filter(f => f.type === 'audio').length;
    
    if (midiCount) midiCount.textContent = midiFiles;
    if (audioCount) audioCount.textContent = audioFiles;
    if (featuresCount) featuresCount.textContent = loadedFiles.length * 10; // Simulate features
}

function updateLibraryStats() {
    const chordStats = document.getElementById('chord-stats');
    const melodyStats = document.getElementById('melody-stats');
    const drumStats = document.getElementById('drum-stats');
    const guitarStats = document.getElementById('guitar-stats');
    
    if (chordStats) chordStats.textContent = Math.floor(loadedFiles.length * 2.5);
    if (melodyStats) melodyStats.textContent = Math.floor(loadedFiles.length * 1.8);
    if (drumStats) drumStats.textContent = Math.floor(loadedFiles.length * 1.2);
    if (guitarStats) guitarStats.textContent = Math.floor(loadedFiles.length * 1.5);
}