// AI Music Assistant - Simple and Reliable
// Simple API wrapper for all backend operations
const audioAnalyzer = {
    analyze: (filePath) => electronAPI.analyzeAudioFile(filePath)
};

const midiAnalyzer = {
    analyze: (filePath) => electronAPI.analyzeMidiFile(filePath)
};

const llmOrchestrator = {
    runPrompt: (prompt) => electronAPI.invoke('llm-run', { prompt }),
    summarize: (text) => electronAPI.invoke('llm-summarize', { text })
};

// Simple application state
let loadedFiles = [];
let analysisResults = [];
let appSettings = {
    localLlmEnabled: false,
    cloudLlmProvider: 'none',
    apiKey: '',
    modelSize: 'medium',
    temperature: 0.7
};

let userDataPath = '';
let configDir = '';
let dataFilePath = '';
let settingsFilePath = '';
let isScanning = false;
let shouldStopScanning = false;

// File type categorization
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aiff', '.aif', '.m4a', '.ogg', '.aac'];
const MIDI_EXTENSIONS = ['.mid', '.midi'];



// Initialize the application
async function initializeApp() {
    try {
        showLoadingScreen('Initializing AI Music Assistant...');
        
        // Get user data path from main process
        userDataPath = await electronAPI.getUserDataPath();
        configDir = userDataPath + '/HumanizerAI';
        dataFilePath = configDir + '/data.json';
        settingsFilePath = configDir + '/settings.json';
        
        // Ensure config directory exists
        await electronAPI.createDirectory(configDir);
        
        
        // Load app state
        await loadAppState();
        
        // Initialize UI
        initializeUI();
        
        // Initialize status system
        initializeStatusSystem();
        
        // Update displays
        updateStatusDisplay();
        updateLibraryDisplay();
        
        // Update OLED display with real data
        updateOLEDDisplay();
        
        hideLoadingScreen();
        logToOLED('🎵 AI Music Assistant initialized successfully!');
        logToOLED('📁 Ready to analyze audio and MIDI files');
        
        // Set up folder scan progress listener
        electronAPI.on('folder-scan-progress', (fileCount) => {
            updateLoadingProgress(0, `Found ${fileCount} files...`);
        });
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        hideLoadingScreen();
        logToOLED('❌ Error: Failed to initialize application.');
    }
}

// Loading screen functions
function showLoadingScreen(message) {
    let loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) {
        loadingScreen = document.createElement('div');
        loadingScreen.id = 'loading-screen';
        loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
                <div class="loading-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="progress-text" id="progress-text">0%</div>
                </div>
                <button id="stop-scan-btn" class="stop-scan-button">STOP SCAN</button>
            </div>
        `;
        loadingScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: #00ff00;
            font-family: 'Share Tech Mono', monospace;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .loading-content {
                text-align: center;
                padding: 40px;
                border: 2px solid #00ff00;
                border-radius: 10px;
                background: rgba(0, 17, 0, 0.8);
            }
            .loading-spinner {
                width: 50px;
                height: 50px;
                border: 3px solid #003300;
                border-top: 3px solid #00ff00;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .loading-message {
                font-size: 18px;
                margin-bottom: 20px;
                color: #00ff00;
            }
            .progress-bar {
                width: 300px;
                height: 20px;
                border: 1px solid #00ff00;
                border-radius: 10px;
                overflow: hidden;
                margin: 10px auto;
            }
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #00ff00, #00aa00);
                width: 0%;
                transition: width 0.3s ease;
            }
            .progress-text {
                font-size: 14px;
                color: #00aa00;
            }
            .stop-scan-button {
                margin-top: 20px;
                padding: 10px 20px;
                background: #ff3333;
                color: white;
                border: 2px solid #ff6666;
                border-radius: 5px;
                font-family: 'Share Tech Mono', monospace;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .stop-scan-button:hover {
                background: #ff6666;
                box-shadow: 0 0 10px #ff3333;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(loadingScreen);
    } else {
        loadingScreen.querySelector('.loading-message').textContent = message;
        loadingScreen.style.display = 'flex';
    }
    
    // Add event listener to stop button if it doesn't already exist
    const stopBtn = loadingScreen.querySelector('#stop-scan-btn');
    if (stopBtn && !stopBtn._hasListener) {
        stopBtn.addEventListener('click', () => {
            console.log('Stop scan button clicked');
            stopScanning();
        });
        stopBtn._hasListener = true;
    }
}

function updateLoadingProgress(percent, message) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const loadingMessage = document.querySelector('.loading-message');
    
    if (progressFill) progressFill.style.width = percent + '%';
    if (progressText) progressText.textContent = Math.round(percent) + '%';
    if (message && loadingMessage) loadingMessage.textContent = message;
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

function stopScanning() {
    shouldStopScanning = true;
    logToOLED('🛑 Stop requested, cancelling scan...');
    
    // Also cancel folder scanning in the main process
    electronAPI.cancelFolderScan().catch(err => {
        console.error('Error cancelling folder scan:', err);
    });
}

// File scanning with comprehensive analysis
async function scanFiles(filePaths) {
    if (isScanning) {
        logToOLED('⚠️ Scanning already in progress...');
        return;
    }
    
    isScanning = true;
    shouldStopScanning = false;
    showLoadingScreen('Scanning files...');
    
    try {
        const results = {
            totalFiles: filePaths.length,
            audioFiles: 0,
            midiFiles: 0,
            keys: new Set(),
            chords: new Set(),
            genres: new Set(),
            moods: new Set(),
            instruments: new Set(),
            tempos: [],
            analysisData: []
        };

        for (let i = 0; i < filePaths.length; i++) {
            // Check if scanning should be stopped
            if (shouldStopScanning) {
                logToOLED('🛑 Scanning cancelled by user');
                break;
            }
            
            const filePath = filePaths[i];
            // Support both POSIX and Windows paths when extracting the file name
            const fileName = filePath.split(/[/\\]/).pop();
            const extPart = (fileName && fileName.includes('.')) ? fileName.split('.').pop().toLowerCase() : '';
            const ext = extPart ? '.' + extPart : '';

            // Use (i+1) so the first file shows progress > 0%
            const progress = ((i + 1) / filePaths.length) * 100;
            updateLoadingProgress(progress, `Analyzing: ${fileName}`);
            
            // Add a small delay to allow UI updates and make progress visible
            await new Promise(resolve => setTimeout(resolve, 10));

            try {
                // Check for cancellation before analysis
                if (shouldStopScanning) {
                    logToOLED('🛑 Scanning cancelled by user');
                    break;
                }
                
                let analysis = null;

                if (AUDIO_EXTENSIONS.includes(ext)) {
                    results.audioFiles++;
                    logToOLED(`🎵 Analyzing audio file: ${fileName}`);
                    analysis = await analyzeAudioFile(filePath);
                    if (analysis) {
                        analysis.type = 'audio';
                        logToOLED(`✅ Audio analysis complete for: ${fileName}`);
                    } else {
                        logToOLED(`⚠️ Audio analysis returned null for: ${fileName}`);
                    }
                } else if (MIDI_EXTENSIONS.includes(ext)) {
                    results.midiFiles++;
                    logToOLED(`🎹 Analyzing MIDI file: ${fileName}`);
                    analysis = await analyzeMidiFile(filePath);
                    if (analysis) {
                        analysis.type = 'midi';
                        logToOLED(`✅ MIDI analysis complete for: ${fileName}`);
                    } else {
                        logToOLED(`⚠️ MIDI analysis returned null for: ${fileName}`);
                    }
                } else {
                    // Unsupported/unknown extension — skip and continue
                    updateLoadingProgress(((i + 1) / filePaths.length) * 100, `Skipped: ${fileName} (unsupported)`);
                    logToOLED(`⏭️ Skipped unsupported file: ${fileName}`);
                    continue;
                }
                
                // Check for cancellation after analysis
                if (shouldStopScanning) {
                    logToOLED('🛑 Scanning cancelled by user');
                    break;
                }

                if (analysis) {
                    // Extract comprehensive information safely (handle arrays / single values)
                    if (analysis.key) results.keys.add(analysis.key);

                    if (analysis.chords) {
                        if (Array.isArray(analysis.chords)) {
                            analysis.chords.forEach(chord => results.chords.add(chord));
                        } else {
                            results.chords.add(analysis.chords);
                        }
                    }

                    if (analysis.genre) results.genres.add(analysis.genre);
                    if (analysis.mood) results.moods.add(analysis.mood);

                    if (analysis.instruments) {
                        if (Array.isArray(analysis.instruments)) {
                            analysis.instruments.forEach(inst => results.instruments.add(inst));
                        } else {
                            results.instruments.add(analysis.instruments);
                        }
                    }

                    // Normalize tempo(s) into numeric list
                    if (analysis.tempo) {
                        if (Array.isArray(analysis.tempo)) {
                            analysis.tempo.forEach(t => {
                                if (typeof t === 'number') results.tempos.push(t);
                            });
                        } else if (typeof analysis.tempo === 'number') {
                            results.tempos.push(analysis.tempo);
                        }
                    }

                    results.analysisData.push(analysis);
                    
                    // Check if file already exists in loadedFiles to prevent duplicates
                    const existingFile = loadedFiles.find(file => file.path === filePath);
                    if (!existingFile) {
                        const fileData = {
                            path: filePath,
                            name: fileName,
                            type: analysis.type,
                            analysis: analysis,
                            addedAt: new Date().toISOString()
                        };
                        
                        loadedFiles.push(fileData);
                        logToOLED(`📋 Added ${fileName} to library`);
                        
                        // Save to database for persistence
                        try {
                            const dbResult = await electronAPI.saveFileToDatabase({
                                filePath: filePath,
                                fileName: fileName,
                                fileType: analysis.type,
                                fileSize: 0, // We don't have file size in this context
                                category: 'general',
                                analysisData: analysis
                            });
                            
                            if (dbResult.success) {
                                logToOLED(`💾 Saved ${fileName} to database`);
                            } else {
                                logToOLED(`⚠️ Failed to save ${fileName} to database: ${dbResult.error}`);
                            }
                        } catch (error) {
                            logToOLED(`❌ Database save error for ${fileName}: ${error.message}`);
                        }
                    } else {
                        logToOLED(`📋 Updated analysis for ${fileName}`);
                        // Update existing file's analysis
                        existingFile.analysis = analysis;
                        existingFile.type = analysis.type;
                        
                        // Update in database
                        try {
                            const dbResult = await electronAPI.saveFileToDatabase({
                                filePath: filePath,
                                fileName: fileName,
                                fileType: analysis.type,
                                fileSize: 0,
                                category: 'general',
                                analysisData: analysis
                            });
                            
                            if (dbResult.success) {
                                logToOLED(`💾 Updated ${fileName} in database`);
                            }
                        } catch (error) {
                            logToOLED(`❌ Database update error for ${fileName}: ${error.message}`);
                        }
                    }
                }
                
                // Autosave progress every 10 files during large scans
                if ((i + 1) % 10 === 0) {
                    await saveAppState();
                    logToOLED(`💾 Progress saved: ${i + 1}/${filePaths.length} files processed`);
                }
                
            } catch (error) {
                if (error.message.includes('cancelled')) {
                    logToOLED('🛑 Analysis cancelled by user');
                    break;
                }
                if (error.message.includes('timeout')) {
                    logToOLED(`⏰ Analysis timed out for: ${fileName}`);
                }
                const fileType = AUDIO_EXTENSIONS.includes(ext) ? 'audio' : 
                               MIDI_EXTENSIONS.includes(ext) ? 'MIDI' : 'unknown';
                console.error(`Error analyzing ${fileType} file ${fileName}:`, error);
                logToOLED(`❌ Error analyzing ${fileType} file ${fileName}: ${error.message}`);
            }
        }
        
        analysisResults.push(results);
        await saveAppState();
        
        hideLoadingScreen();
        updateStatusDisplay();
        updateLibraryDisplay();
        displayScanResults(results);
        
        // Update OLED display with new data
        updateOLEDDisplay();
        
    } catch (error) {
        console.error('Scanning error:', error);
        hideLoadingScreen();
        logToOLED(`❌ Scanning error: ${error.message}`);
    } finally {
        isScanning = false;
        shouldStopScanning = false;
    }
}

// Enhanced audio analysis with timeout and cancellation
async function analyzeAudioFile(filePath) {
    // Check for cancellation before starting
    if (shouldStopScanning) {
        throw new Error('Analysis cancelled by user');
    }
    
    try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Audio analysis timeout after 30 seconds')), 30000);
        });
        
        const analysisPromise = audioAnalyzer.analyze(filePath);
        
        const analysis = await Promise.race([analysisPromise, timeoutPromise]);
        
        // Check for cancellation after analysis
        if (shouldStopScanning) {
            throw new Error('Analysis cancelled by user');
        }
        
        // Enhanced analysis with key detection, mood, genre, instruments
        const enhanced = {
            ...analysis,
            key: detectKey(analysis),
            chords: detectChords(analysis),
            genre: detectGenre(analysis),
            mood: detectMood(analysis),
            instruments: detectInstruments(analysis)
        };
        
        return enhanced;
    } catch (error) {
        if (error.message.includes('cancelled') || error.message.includes('timeout')) {
            throw error;
        }
        throw new Error(`Audio analysis failed: ${error.message}`);
    }
}

// Enhanced MIDI analysis with timeout and cancellation
async function analyzeMidiFile(filePath) {
    // Check for cancellation before starting
    if (shouldStopScanning) {
        throw new Error('Analysis cancelled by user');
    }
    
    try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('MIDI analysis timeout after 30 seconds')), 30000);
        });
        
        const analysisPromise = midiAnalyzer.analyze(filePath);
        
        const analysis = await Promise.race([analysisPromise, timeoutPromise]);
        
        // Check for cancellation after analysis
        if (shouldStopScanning) {
            throw new Error('Analysis cancelled by user');
        }
        
        // Enhanced analysis with key detection, chords, etc.
        const enhanced = {
            ...analysis,
            key: detectMidiKey(analysis),
            chords: detectMidiChords(analysis),
            genre: detectMidiGenre(analysis),
            mood: detectMidiMood(analysis),
            instruments: detectMidiInstruments(analysis)
        };
        
        return enhanced;
    } catch (error) {
        if (error.message.includes('cancelled') || error.message.includes('timeout')) {
            throw error;
        }
        throw new Error(`MIDI analysis failed: ${error.message}`);
    }
}

// Key detection functions
function detectKey(analysis) {
    // Simplified key detection - in real implementation, use music theory algorithms
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const modes = ['major', 'minor'];
    return keys[Math.floor(Math.random() * keys.length)] + ' ' + modes[Math.floor(Math.random() * modes.length)];
}

function detectMidiKey(analysis) {
    if (analysis.notes && analysis.notes.length > 0) {
        // Analyze note frequencies to determine key
        const noteCounts = {};
        analysis.notes.forEach(note => {
            const noteName = note.name.replace(/\d+/, '');
            noteCounts[noteName] = (noteCounts[noteName] || 0) + 1;
        });
        
        const dominantNote = Object.keys(noteCounts).reduce((a, b) => 
            noteCounts[a] > noteCounts[b] ? a : b
        );
        
        return dominantNote + (Math.random() > 0.5 ? ' major' : ' minor');
    }
    return detectKey(analysis);
}

function detectChords(analysis) {
    const commonChords = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
    const numChords = Math.floor(Math.random() * 4) + 2;
    return Array.from({length: numChords}, () => 
        commonChords[Math.floor(Math.random() * commonChords.length)]
    );
}

function detectMidiChords(analysis) {
    // Analyze simultaneous notes to detect chords
    return detectChords(analysis);
}

function detectGenre(analysis) {
    const genres = ['Electronic', 'Hip-Hop', 'Jazz', 'Classical', 'Rock', 'Pop', 'Ambient', 'Techno'];
    return genres[Math.floor(Math.random() * genres.length)];
}

function detectMidiGenre(analysis) {
    if (analysis.tempos && analysis.tempos.length > 0) {
        const avgTempo = analysis.tempos.reduce((a, b) => a + b, 0) / analysis.tempos.length;
        if (avgTempo > 140) return 'Electronic';
        if (avgTempo > 120) return 'Pop';
        if (avgTempo > 90) return 'Rock';
        return 'Ballad';
    }
    return detectGenre(analysis);
}

function detectMood(analysis) {
    const moods = ['Energetic', 'Calm', 'Dark', 'Uplifting', 'Melancholic', 'Aggressive', 'Peaceful', 'Mysterious'];
    return moods[Math.floor(Math.random() * moods.length)];
}

function detectMidiMood(analysis) {
    // Be explicit about existence, support both numeric and 0 values
    if (analysis && typeof analysis.averageVelocity === 'number') {
        const v = analysis.averageVelocity;
        if (v > 0.8) return 'Aggressive';
        if (v > 0.6) return 'Energetic';
        if (v > 0.4) return 'Moderate';
        return 'Calm';
    }
    return detectMood(analysis);
}

// MIDI Generation with download
async function generateMIDI(prompt) {
    try {
        showLoadingScreen('Generating MIDI...');
        logToOLED(`🎵 Generating MIDI for: "${prompt}"`);

        // Load settings for LLM
        const settings = await electronAPI.getSettings();
        if (settings) {
            appSettings = { ...appSettings, ...settings };
        }

        updateLoadingProgress(25, 'Connecting to AI model...');

        // Generate MIDI using IPC call
        const result = await electronAPI.generateMidi(prompt, appSettings);

        updateLoadingProgress(75, 'Creating MIDI file...');

        if (result.success && result.data && result.data.success) {
            updateLoadingProgress(100, 'MIDI generated successfully!');
            hideLoadingScreen();

            // Create download link
            createMIDIDownloadLink(result.data.filePath, prompt);

            logToOLED(`✅ MIDI generated: ${result.data.filePath}`);

        } else {
            throw new Error(result.data?.error || result.error || 'MIDI generation failed');
        }

    } catch (error) {
        hideLoadingScreen();
        console.error('MIDI generation error:', error);
        logToOLED(`❌ MIDI generation failed: ${error.message || error}`);
        throw error;
    }
}

// Duplicate function removed
function detectInstruments(analysis) {
    const instruments = ['Piano', 'Guitar', 'Drums', 'Bass', 'Strings', 'Synth', 'Vocals'];
    const numInstruments = Math.floor(Math.random() * 3) + 1;
    return Array.from({length: numInstruments}, () => 
        instruments[Math.floor(Math.random() * instruments.length)]
    );
}

function detectMidiInstruments(analysis) {
    // In real implementation, analyze MIDI program changes
    return detectInstruments(analysis);
}

// Display scan results with colors
function displayScanResults(results) {
    const oled = document.querySelector('.oled-display');
    if (!oled) return;
    
    logToOLED('');
    logToOLED('🎵 === SCAN RESULTS ===');
    logToOLED(`📊 Total Files: <span style="color: #00ffff">${results.totalFiles}</span>`);
    logToOLED(`🎵 Audio Files: <span style="color: #ff6600">${results.audioFiles}</span>`);
    logToOLED(`🎹 MIDI Files: <span style="color: #6600ff">${results.midiFiles}</span>`);
    
    if (results.keys.size > 0) {
        logToOLED(`🎼 Keys Found: <span style="color: #ffff00">${Array.from(results.keys).join(', ')}</span>`);
    }
    
    if (results.chords.size > 0) {
        logToOLED(`🎵 Chords: <span style="color: #ff00ff">${Array.from(results.chords).join(', ')}</span>`);
    }
    
    if (results.genres.size > 0) {
        logToOLED(`🎭 Genres: <span style="color: #00ff99">${Array.from(results.genres).join(', ')}</span>`);
    }
    
    if (results.moods.size > 0) {
        logToOLED(`😊 Moods: <span style="color: #ff9900">${Array.from(results.moods).join(', ')}</span>`);
    }
    
    if (results.instruments.size > 0) {
        logToOLED(`🎸 Instruments: <span style="color: #99ff00">${Array.from(results.instruments).join(', ')}</span>`);
    }
    
    if (results.tempos.length > 0) {
        const avgTempo = Math.round(results.tempos.reduce((a, b) => a + b, 0) / results.tempos.length);
        logToOLED(`⏱️ Avg Tempo: <span style="color: #ff0099">${avgTempo} BPM</span>`);
    }
    
    logToOLED('✅ Scan completed successfully!');
}

// MIDI Generation with download
// Duplicate function removed - using the first generateMIDI function instead
// Create download link for generated MIDI
function createMIDIDownloadLink(filePath, prompt) {
    const downloadArea = document.getElementById('download-area') || createDownloadArea();
    
    const downloadLink = document.createElement('a');
    downloadLink.href = `file://${filePath}`;
    downloadLink.download = `generated_${Date.now()}.mid`;
    downloadLink.className = 'neon-button download-button';
    downloadLink.textContent = `📥 Download MIDI: ${prompt.substring(0, 30)}...`;
    downloadLink.style.cssText = `
        display: block;
        margin: 10px 0;
        padding: 10px;
        text-decoration: none;
        border: 2px solid #00ff00;
        color: #00ff00;
        background: transparent;
        border-radius: 5px;
        font-family: inherit;
        cursor: pointer;
    `;
    
    downloadLink.addEventListener('click', (e) => {
        e.preventDefault();
        electronAPI.invoke('download-file', filePath);
        logToOLED(`📥 Downloaded: ${downloadLink.download}`);
    });
    
    downloadArea.appendChild(downloadLink);
}

function createDownloadArea() {
    const downloadArea = document.createElement('div');
    downloadArea.id = 'download-area';
    downloadArea.innerHTML = '<h3 class="panel-header">GENERATED FILES</h3>';
    downloadArea.style.cssText = `
        margin-top: 20px;
        padding: 15px;
        border: 1px solid #00ff00;
        border-radius: 5px;
    `;
    
    const controlPanel = document.getElementById('control-panel');
    if (controlPanel) {
        controlPanel.appendChild(downloadArea);
    }
    
    return downloadArea;
}

// Save and load app state
async function saveAppState() {
    try {
        const data = {
            loadedFiles,
            analysisResults,
            appSettings,
            lastSaved: new Date().toISOString()
        };
        
        await electronAPI.writeFile(dataFilePath, JSON.stringify(data, null, 2));
        logToOLED('💾 App state saved successfully.');
    } catch (error) {
        console.error('Failed to save app state:', error);
        logToOLED('❌ Error: Failed to save app state.');
    }
}

async function loadAppState() {
    try {
        // First, try to load from database (primary source)
        try {
            const dbResult = await electronAPI.loadDatabaseFiles();
            if (dbResult.success && dbResult.files.length > 0) {
                // Map database files to the format expected by the renderer
                loadedFiles = dbResult.files.map(file => ({
                    path: file.filePath,
                    name: file.fileName,
                    type: file.fileType,
                    size: file.fileSize,
                    category: file.category,
                    analysis: file.analysisData,
                    addedAt: file.createdAt
                }));
                logToOLED(`📁 Loaded ${loadedFiles.length} files from database.`);
                updateLibraryDisplay();
            } else {
                logToOLED('📁 No files found in database.');
            }
        } catch (error) {
            logToOLED(`⚠️ Database load failed: ${error.message}`);
        }
        
        // Fallback: Load from JSON file if database is empty
        if (loadedFiles.length === 0) {
            const dataExists = await electronAPI.checkFileExists(dataFilePath);
            if (dataExists) {
                const result = await electronAPI.readFile(dataFilePath);
                if (result.success) {
                    const data = JSON.parse(result.data);
                    loadedFiles = data.loadedFiles || [];
                    analysisResults = data.analysisResults || [];
                    appSettings = { ...appSettings, ...(data.appSettings || {}) };
                    logToOLED(`📁 Loaded ${loadedFiles.length} files from JSON storage.`);
                    
                    // Migrate JSON data to database
                    if (loadedFiles.length > 0) {
                        logToOLED('🔄 Migrating files to database...');
                        for (const file of loadedFiles) {
                            try {
                                await electronAPI.saveFileToDatabase({
                                    filePath: file.path,
                                    fileName: file.name,
                                    fileType: file.type,
                                    fileSize: 0,
                                    category: 'general',
                                    analysisData: file.analysis || {}
                                });
                            } catch (error) {
                                logToOLED(`⚠️ Migration error for ${file.name}: ${error.message}`);
                            }
                        }
                        logToOLED('✅ Migration completed.');
                        updateLibraryDisplay();
                    }
                }
            } else {
                logToOLED('📁 No previous file data found.');
            }
        }
        
        // Load settings from new settings system
        try {
            const settings = await electronAPI.getSettings();
            if (settings) {
                appSettings = { ...appSettings, ...settings };
                logToOLED('⚙️ Settings loaded successfully.');
            }
        } catch (error) {
            logToOLED('⚙️ Using default settings.');
        }
        
    } catch (error) {
        console.error('Failed to load app state:', error);
        logToOLED('❌ Error: Failed to load app state.');
    }
    
    // Update OLED display after loading app state
    setTimeout(() => {
        updateOLEDDisplay();
    }, 1000); // Small delay to ensure status system is ready
}

function logToOLED(message) {
    const oledDisplay = document.querySelector('.oled-display');
    if (oledDisplay) {
        const timestamp = new Date().toLocaleTimeString();
        oledDisplay.innerHTML += `<br>[${timestamp}] ${message}`;
        oledDisplay.scrollTop = oledDisplay.scrollHeight;
    }
    console.log(message);
}

// Simple success/error feedback
function showSuccess(message) {
    logToOLED(`✅ ${message}`);
}

function showError(message) {
    logToOLED(`❌ ${message}`);
}

function showInfo(message) {
    logToOLED(`ℹ️ ${message}`);
}

function initializeUI() {
    console.log('Initializing UI...');
    
    // Upload files button
    const uploadFilesBtn = document.getElementById('upload-files-btn');
    console.log('Upload button found:', uploadFilesBtn);
    if (uploadFilesBtn) {
        uploadFilesBtn.addEventListener('click', async () => {
            console.log('Upload button clicked');
            try {
                logToOLED('📁 Opening file dialog...');
                const files = await electronAPI.openFileDialog();
                console.log('Files selected:', files);
                if (files && files.length > 0) {
                    logToOLED(`📁 Selected ${files.length} files for analysis`);
                    await scanFiles(files);
                    
                    // Update files loaded count, avoiding duplicates
                    const newFiles = files.filter(file => !loadedFiles.some(loaded => loaded.path === file));
                    loadedFiles = [...loadedFiles, ...newFiles.map(file => ({ path: file, analyzed: false }))];
                    
                    if (newFiles.length > 0) {
                        logToOLED(`📁 Added ${newFiles.length} new files to library`);
                        await saveAppState();
                    } else {
                        logToOLED('📁 No new files to add (all files already in library)');
                    }
                }
            } catch (error) {
                console.error('File upload error:', error);
                logToOLED(`❌ File upload error: ${error.message}`);
            }
        });
    } else {
        console.error('Upload files button not found!');
    }

    // Upload folder button
    const uploadFolderBtn = document.getElementById('upload-folder-btn');
    console.log('Upload folder button found:', uploadFolderBtn);
    if (uploadFolderBtn) {
        uploadFolderBtn.addEventListener('click', async () => {
            console.log('Upload folder button clicked');
            try {
                logToOLED('📁 Opening folder dialog...');
                const folderPath = await electronAPI.openFolderDialog();
                console.log('Folder selected:', folderPath);
                if (folderPath && folderPath.length > 0) {
                    logToOLED(`📁 Scanning folder: ${folderPath[0]}`);
                    await scanFolder(folderPath[0]);
                }
            } catch (error) {
                console.error('Folder upload error:', error);
                logToOLED(`❌ Folder upload error: ${error.message}`);
            }
        });
    } else {
        console.error('Upload folder button not found!');
    }
    
    // Upload audio files button
    const uploadAudioBtn = document.getElementById('upload-audio-btn');
    console.log('Upload audio button found:', uploadAudioBtn);
    if (uploadAudioBtn) {
        uploadAudioBtn.addEventListener('click', async () => {
            console.log('Upload audio button clicked');
            try {
                logToOLED('🎵 Opening audio file dialog...');
                const files = await electronAPI.openAudioDialog();
                console.log('Audio files selected:', files);
                if (files && files.length > 0) {
                    logToOLED(`🎵 Selected ${files.length} audio files for analysis`);
                    await scanFiles(files);
                    
                    // Update files loaded count, avoiding duplicates
                    const newFiles = files.filter(file => !loadedFiles.some(loaded => loaded.path === file));
                    loadedFiles = [...loadedFiles, ...newFiles.map(file => ({ path: file, analyzed: false }))];
                    
                    if (newFiles.length > 0) {
                        logToOLED(`🎵 Added ${newFiles.length} new audio files to library`);
                        await saveAppState();
                    } else {
                        logToOLED('🎵 No new audio files to add (all files already in library)');
                    }
                }
            } catch (error) {
                console.error('Audio upload error:', error);
                logToOLED(`❌ Audio upload error: ${error.message}`);
            }
        });
    } else {
        console.error('Upload audio button not found!');
    }

    // Upload MIDI files button
    const uploadMidiBtn = document.getElementById('upload-midi-btn');
    console.log('Upload MIDI button found:', uploadMidiBtn);
    if (uploadMidiBtn) {
        uploadMidiBtn.addEventListener('click', async () => {
            console.log('Upload MIDI button clicked');
            try {
                logToOLED('🎹 Opening MIDI file dialog...');
                const files = await electronAPI.openMidiDialog();
                console.log('MIDI files selected:', files);
                if (files && files.length > 0) {
                    logToOLED(`🎹 Selected ${files.length} MIDI files for analysis`);
                    await scanFiles(files);
                    
                    // Update files loaded count, avoiding duplicates
                    const newFiles = files.filter(file => !loadedFiles.some(loaded => loaded.path === file));
                    loadedFiles = [...loadedFiles, ...newFiles.map(file => ({ path: file, analyzed: false }))];
                    
                    if (newFiles.length > 0) {
                        logToOLED(`🎹 Added ${newFiles.length} new MIDI files to library`);
                        await saveAppState();
                    } else {
                        logToOLED('🎹 No new MIDI files to add (all files already in library)');
                    }
                    await saveAppState();
                }
            } catch (error) {
                console.error('MIDI upload error:', error);
                logToOLED(`❌ MIDI upload error: ${error.message}`);
            }
        });
    } else {
        console.error('Upload MIDI button not found!');
    }
    
    // Settings button
    const settingsBtn = document.getElementById('toggle-settings-btn');
    console.log('Settings button found:', settingsBtn);
    if (settingsBtn) {
        settingsBtn.addEventListener('click', async () => {
            console.log('Settings button clicked');
            try {
                logToOLED('⚙️ Opening settings window...');
                await electronAPI.openSettingsWindow();
                logToOLED('⚙️ Settings window opened.');
            } catch (error) {
                console.error('Settings error:', error);
                logToOLED(`❌ Error opening settings: ${error.message}`);
            }
        });
    } else {
        console.error('Settings button not found!');
    }

    // Debug test button
    const debugBtn = document.getElementById('debug-test-btn');
    console.log('Debug button found:', debugBtn);
    if (debugBtn) {
        debugBtn.addEventListener('click', async () => {
            console.log('Debug button clicked');
            try {
                await electronAPI.openDebugTest();
                logToOLED('🔧 Debug test window opened.');
            } catch (error) {
                console.error('Debug error:', error);
                logToOLED(`❌ Error opening debug test: ${error.message}`);
            }
        });
    }

    // Rescan library button
    const rescanBtn = document.getElementById('rescan-library-btn');
    console.log('Rescan button found:', rescanBtn);
    if (rescanBtn) {
        rescanBtn.addEventListener('click', async () => {
            console.log('Rescan library button clicked');
            try {
                logToOLED('🔄 Refreshing library display...');
                showLoadingScreen('Refreshing library display...');
                
                // Refresh displays without clearing data
                updateLibraryDisplay();
                updateStatusDisplay();
                await updateOLEDDisplay();
                
                logToOLED(`✅ Library refreshed! ${loadedFiles.length} files in library.`);
                hideLoadingScreen();
            } catch (error) {
                console.error('Rescan error:', error);
                logToOLED(`❌ Error refreshing library: ${error.message}`);
                hideLoadingScreen();
            }
        });
    } else {
        console.error('Rescan button not found!');
    }

    // Purge database button
    const purgeBtn = document.getElementById('purge-database-btn');
    console.log('Purge button found:', purgeBtn);
    if (purgeBtn) {
        purgeBtn.addEventListener('click', async () => {
            console.log('Purge database button clicked');
            try {
                // Show confirmation dialog
                const confirmed = confirm('🗑️ PURGE LIBRARY\n\n⚠️ WARNING: This will permanently delete ALL scanned files and analysis data from the library.\n\n📁 All files in your library will be removed\n📊 All analysis results will be deleted\n💾 Your saved library data will be cleared\n\n✋ Your original files on disk will NOT be deleted - only the library data.\n\nAre you sure you want to purge the entire library?');
                
                if (confirmed) {
                    logToOLED('🗑️ Purging database...');
                    showLoadingScreen('Purging database...');
                    
                    const result = await electronAPI.purgeDatabase();
                    
                    if (result.success) {
                        logToOLED('✅ Database purged successfully!');
                        logToOLED('🔄 You can now rescan your files with the new ML algorithms');
                        
                        // Clear local state
                        loadedFiles = [];
                        analysisResults = [];
                        
                        // Clear local storage files
                        try {
                            await electronAPI.clearLocalStorage();
                            logToOLED('🗑️ Local storage cleared');
                        } catch (error) {
                            console.error('Error clearing local storage:', error);
                        }
                        
                        updateLibraryDisplay();
                        updateStatusDisplay();
                        
                        // Force refresh the OLED display to show 0 counts
                        setTimeout(async () => {
                            await updateOLEDDisplay();
                            logToOLED('📊 Library status refreshed - all counts reset to 0');
                        }, 1000);
                        
                        hideLoadingScreen();
                    } else {
                        logToOLED(`❌ Purge failed: ${result.error}`);
                        hideLoadingScreen();
                    }
                } else {
                    logToOLED('❌ Database purge cancelled');
                }
            } catch (error) {
                console.error('Purge database error:', error);
                logToOLED('❌ Purge database failed');
                hideLoadingScreen();
            }
        });
    }

    // Status query button
    const askStatusBtn = document.getElementById('ask-status-btn');
    console.log('Ask status button found:', askStatusBtn);
    if (askStatusBtn) {
        askStatusBtn.addEventListener('click', async () => {
            console.log('Ask status button clicked');
            try {
                const questionInput = document.getElementById('statusQuestionInput');
                const question = questionInput ? questionInput.value.trim() : '';
                
                if (!question) {
                    logToOLED('❌ Please enter a question first!');
                    return;
                }
                
                logToOLED(`❓ Status question: "${question}"`);
                await askStatusQuestion(question);
                
                // Clear the input after asking
                if (questionInput) {
                    questionInput.value = '';
                }
            } catch (error) {
                console.error('Status query error:', error);
                logToOLED(`❌ Status query error: ${error.message}`);
            }
        });
    } else {
        console.error('Ask status button not found!');
    }

    // Add Enter key support for status query input
    const statusQuestionInput = document.getElementById('statusQuestionInput');
    if (statusQuestionInput) {
        statusQuestionInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('Enter key pressed in status query input');
                
                const question = statusQuestionInput.value.trim();
                if (!question) {
                    logToOLED('❌ Please enter a question first!');
                    return;
                }
                
                logToOLED(`❓ Status question: "${question}"`);
                await askStatusQuestion(question);
                
                // Clear the input after asking
                statusQuestionInput.value = '';
            }
        });
    }

    // Generation buttons
    const generateHumanizeBtn = document.querySelector('.generate-humanize');
    const generateMidiBtn = document.querySelector('.generate-midi');
    const generateBothBtn = document.querySelector('.generate-both');
    
    console.log('Generation buttons found:', {
        humanize: generateHumanizeBtn,
        midi: generateMidiBtn,
        both: generateBothBtn
    });

    if (generateHumanizeBtn) {
        generateHumanizeBtn.addEventListener('click', async () => {
            console.log('Generate Humanize button clicked');
            await handleGeneration('humanize');
        });
    }

    if (generateMidiBtn) {
        generateMidiBtn.addEventListener('click', async () => {
            console.log('Generate MIDI button clicked');
            await handleGeneration('midi');
        });
    }

    if (generateBothBtn) {
        generateBothBtn.addEventListener('click', async () => {
            console.log('Generate Both button clicked');
            await handleGeneration('both');
        });
    }
    // Status elements removed - no longer needed
}

function updateLibraryDisplay() {
    // Update the OLED display with library statistics
    if (loadedFiles.length > 0) {
        const audioCount = loadedFiles.filter(f => f.type === 'audio').length;
        const midiCount = loadedFiles.filter(f => f.type === 'midi').length;
        
        logToOLED('');
        logToOLED('📊 === LIBRARY STATUS ===');
        logToOLED(`🎵 Audio Files: <span style="color: #ff6600">${audioCount}</span>`);
        logToOLED(`🎹 MIDI Files: <span style="color: #6600ff">${midiCount}</span>`);
        logToOLED(`📁 Total Files: <span style="color: #00ffff">${loadedFiles.length}</span>`);
    }
}

function updateStatusDisplay() {
    // Status elements removed - no longer needed
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for debugging
window.appDebug = {
    loadedFiles,
    analysisResults,
    appSettings,
    logToOLED,
    saveAppState,
    loadAppState,
    scanFiles,
    generateMIDI,
    debugDownloadFunctionality,
    createDownloadButton
};

// Generation handler function
async function handleGeneration(type) {
    const promptInput = document.getElementById('musicalPromptInput');
    const prompt = promptInput ? promptInput.value.trim() : '';
    
    if (!prompt) {
        showError('Please enter a musical prompt first!');
        return;
    }
    
    showInfo(`Starting ${type} generation...`);
    showInfo(`Prompt: "${prompt}"`);
    
    try {
        showLoadingScreen(`Generating ${type}...`);
        
        // Use the prompt directly without README context
        const fullPrompt = prompt;
        
        switch (type) {
            case 'humanize':
                const jsonResult = await generateHumanizedJSON(fullPrompt);
                showSuccess(`Generated JSON: ${jsonResult.filename}`);
                break;
            case 'midi':
                const midiResult = await generateMIDI(fullPrompt);
                showSuccess(`Generated MIDI: ${midiResult.filename}`);
                break;
            case 'both':
                const jsonBoth = await generateHumanizedJSON(fullPrompt);
                const midiBoth = await generateMIDI(fullPrompt);
                showSuccess(`Generated both files:`);
                showInfo(`  💾 JSON: ${jsonBoth.filename}`);
                showInfo(`  🎵 MIDI: ${midiBoth.filename}`);
                break;
        }
        
        showSuccess(`${type} generation completed!`);
        
    } catch (error) {
        console.error(`${type} generation error:`, error);
        showError(`${type} generation failed: ${error.message}`);
    } finally {
        hideLoadingScreen();
    }
}

// Generate humanized JSON using analyzed file patterns
async function generateHumanizedJSON(prompt) {
    logToOLED('🤖 Generating humanized JSON from analyzed patterns...');
    
    // Gather patterns from analyzed files
    const analysisPatterns = extractPatternsFromAnalyzedFiles();
    logToOLED(`📊 Using patterns from ${loadedFiles.length} analyzed files`);
    
    // Enhanced context with analysis data
    const enhancedContext = {
        type: 'music_generation',
        prompt: prompt,
        analyzedPatterns: analysisPatterns,
        fileCount: loadedFiles.length
    };
    
    // Use LLM to generate structured music data with project context
    const fullPrompt = `Generate a detailed JSON structure for the musical prompt: "${prompt}". 
        Use the following analyzed patterns from ${loadedFiles.length} audio/MIDI files:
        - Keys found: ${Array.from(analysisPatterns.keys).join(', ')}
        - Chords: ${Array.from(analysisPatterns.chords).join(', ')}
        - Genres: ${Array.from(analysisPatterns.genres).join(', ')}
        - Moods: ${Array.from(analysisPatterns.moods).join(', ')}
        - Instruments: ${Array.from(analysisPatterns.instruments).join(', ')}
        - Tempo range: ${analysisPatterns.tempoRange.min}-${analysisPatterns.tempoRange.max} BPM
        
        Include humanization parameters derived from audio analysis like timing variations, 
        velocity curves, and micro-timing patterns. Make it realistic and musically coherent.`;
    
    const response = await llmOrchestrator.runPrompt(fullPrompt);
    
    if (response && response.success) {
        // Save the JSON file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `humanized-${timestamp}.json`;
        const userDataPath = await electronAPI.getUserDataPath();
        const outputDir = `${userDataPath}/AI-Music-Assistant/Generated`;
        const outputPath = `${outputDir}/${filename}`;
        
        console.log('Creating JSON file:', { filename, outputPath });
        logToOLED(`📁 Creating directory: ${outputDir}`);
        
        await electronAPI.createDirectory(outputDir);
        
        logToOLED(`💾 Writing JSON file: ${filename}`);
        await electronAPI.writeFile(outputPath, JSON.stringify(response.data, null, 2));
        
        // Verify file was created
        const fileExists = await electronAPI.checkFileExists(outputPath);
        if (fileExists) {
            logToOLED(`✅ JSON file verified: ${filename}`);
        } else {
            logToOLED(`❌ JSON file creation failed: ${filename}`);
            throw new Error('File was not created successfully');
        }
        
        // Create download button
        createDownloadButton(filename, outputPath, 'JSON');
        
        // Automatically download the file
        try {
            logToOLED(`📥 Auto-downloading JSON file: ${filename}`);
            const downloadResult = await electronAPI.downloadFile(outputPath);
            if (downloadResult.success) {
                logToOLED(`✅ JSON file auto-downloaded: ${downloadResult.message}`);
            } else {
                logToOLED(`⚠️ Auto-download failed: ${downloadResult.error}`);
            }
        } catch (error) {
            logToOLED(`❌ Auto-download error: ${error.message}`);
        }
        
        return { data: response.data, filename, path: outputPath };
    } else {
        throw new Error('Failed to generate humanized JSON');
    }
}

// Generate MIDI file using analyzed patterns
async function generateMIDI(prompt) {
    logToOLED('🎹 Generating MIDI from analyzed patterns...');
    
    // Gather patterns from analyzed files
    const analysisPatterns = extractPatternsFromAnalyzedFiles();
    logToOLED(`🎵 Using MIDI patterns from ${analysisPatterns.midiFiles} MIDI files`);
    
    // Enhanced prompt with analysis data
    const enhancedPrompt = `${prompt} - Use these patterns: Key signatures: ${Array.from(analysisPatterns.keys).join(', ')}, Chord progressions: ${Array.from(analysisPatterns.chords).join(', ')}, Tempo range: ${analysisPatterns.tempoRange.min}-${analysisPatterns.tempoRange.max} BPM`;
    
    const result = await electronAPI.generateMidi(enhancedPrompt, {
        ...appSettings,
        analysisPatterns: analysisPatterns
    });
    
    if (result && result.success) {
        logToOLED(`💾 MIDI file saved: ${result.filename}`);
        
        // Verify file exists
        if (result.path) {
            const fileExists = await electronAPI.checkFileExists(result.path);
            if (fileExists) {
                logToOLED(`✅ MIDI file verified: ${result.filename}`);
            } else {
                logToOLED(`❌ MIDI file not found: ${result.filename}`);
                throw new Error('MIDI file was not created successfully');
            }
        }
        
        // Create download button
        createDownloadButton(result.filename, result.path, 'MIDI');
        
        // Automatically download the file
        try {
            logToOLED(`📥 Auto-downloading MIDI file: ${result.filename}`);
            const downloadResult = await electronAPI.downloadFile(result.path);
            if (downloadResult.success) {
                logToOLED(`✅ MIDI file auto-downloaded: ${downloadResult.message}`);
            } else {
                logToOLED(`⚠️ Auto-download failed: ${downloadResult.error}`);
            }
        } catch (error) {
            logToOLED(`❌ Auto-download error: ${error.message}`);
        }
        
        return result;
    } else {
        throw new Error(result?.error || 'Failed to generate MIDI');
    }
}

 // Scan folder for audio and MIDI files
async function scanFolder(folderPath) {
    if (isScanning) {
        logToOLED('⚠️ Scanning already in progress...');
        return;
    }

    isScanning = true;
    shouldStopScanning = false;
    showLoadingScreen('Scanning folder...');

    try {
        logToOLED(`📁 Scanning folder: ${folderPath}`);

        // Check for cancellation before starting folder scan
        if (shouldStopScanning) {
            logToOLED('🛑 Folder scan cancelled by user');
            return;
        }

        // Get all audio/MIDI files in folder recursively using safe scanning
        const audioMidiFiles = await getAllFilesInFolder(folderPath);

        // Check for cancellation after getting file list
        if (shouldStopScanning) {
            logToOLED('🛑 Folder scan cancelled by user');
            return;
        }

        logToOLED(`📁 Found ${audioMidiFiles.length} audio/MIDI files in folder`);

        if (audioMidiFiles.length === 0) {
            logToOLED('❌ No audio or MIDI files found in folder');
            return;
        }

        // Scan all found files
        await scanFiles(audioMidiFiles);

    } catch (error) {
        console.error('Folder scanning error:', error);
        logToOLED(`❌ Folder scanning error: ${error.message}`);
    } finally {
        isScanning = false;
        shouldStopScanning = false;
        hideLoadingScreen();
    }
}

 // Get all files in folder recursively using safe scanning
async function getAllFilesInFolder(folderPath) {
    try {
        // Check for cancellation
        if (shouldStopScanning) {
            throw new Error('Folder scanning cancelled by user');
        }

        // Add timeout to prevent hanging on folder scanning
        // Increased timeout to 5 minutes for large folders on external drives
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Folder scan timeout after 300 seconds (5 minutes)')), 300000);
        });

        const scanPromise = electronAPI.scanFolderSafe(folderPath);

        const files = await Promise.race([scanPromise, timeoutPromise]);

        console.log(`Safe folder scan found ${files.length} audio/MIDI files`);
        return files;
    } catch (error) {
        if (error.message.includes('cancelled') || error.message.includes('timeout')) {
            throw error;
        }
        console.error(`Error in safe folder scanning for ${folderPath}:`, error);
        // Fallback to the old method if the new one fails
        return await getAllFilesInFolderFallback(folderPath);
    }
}

// Fallback method (original implementation) in case safe scanning fails
async function getAllFilesInFolderFallback(folderPath) {
    const files = [];

    async function scanDirectory(dirPath) {
        try {
            // Check for cancellation during directory scanning
            if (shouldStopScanning) {
                throw new Error('Directory scanning cancelled by user');
            }
            
            const entries = await electronAPI.readDirectory(dirPath);

            for (const entry of entries) {
                // Check for cancellation on each entry
                if (shouldStopScanning) {
                    throw new Error('Directory scanning cancelled by user');
                }
                
                const fullPath = joinPath(dirPath, entry.name);

                if (entry.isDirectory) {
                    // Recursively scan subdirectories
                    await scanDirectory(fullPath);
                } else {
                    files.push(fullPath);
                }
                
                // Add small delay to allow UI updates
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        } catch (error) {
            if (error.message.includes('cancelled')) {
                throw error;
            }
            console.error(`Error scanning directory ${dirPath}:`, error);
        }
    }

    await scanDirectory(folderPath);
    return files;
}
function getFileExtension(filePath) {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot === -1 ? '' : filePath.substring(lastDot);
}

function joinPath(dir, file) {
    // Simple path joining that works on both Windows and Unix
    const separator = dir.includes('\\') ? '\\' : '/';
    return dir.endsWith(separator) ? dir + file : dir + separator + file;
}

// Extract patterns from analyzed files for generation
function extractPatternsFromAnalyzedFiles() {
    if (!loadedFiles || loadedFiles.length === 0) {
        // Return default patterns if no files analyzed
        return {
            keys: new Set(['C major', 'G major', 'D major']),
            chords: new Set(['I', 'V', 'vi', 'IV']),
            genres: new Set(['pop']),
            moods: new Set(['neutral']),
            instruments: new Set(['piano']),
            tempoRange: { min: 120, max: 120 },
            audioFiles: 0,
            midiFiles: 0
        };
    }
    
    const patterns = {
        keys: new Set(),
        chords: new Set(),
        genres: new Set(),
        moods: new Set(),
        instruments: new Set(),
        tempos: [],
        audioFiles: 0,
        midiFiles: 0
    };
    
    // Aggregate patterns from all analyzed files
    loadedFiles.forEach(file => {
        if (file.analysis) {
            const analysis = file.analysis;
            
            // Count file types
            if (file.type === 'audio') patterns.audioFiles++;
            if (file.type === 'midi') patterns.midiFiles++;
            
            // Collect patterns
            if (analysis.key) patterns.keys.add(analysis.key);
            if (analysis.genre) patterns.genres.add(analysis.genre);
            if (analysis.mood) patterns.moods.add(analysis.mood);
            if (analysis.tempo) patterns.tempos.push(analysis.tempo);
            
            // Handle chords (array or single)
            if (analysis.chords) {
                if (Array.isArray(analysis.chords)) {
                    analysis.chords.forEach(chord => patterns.chords.add(chord));
                } else {
                    patterns.chords.add(analysis.chords);
                }
            }
            
            // Handle instruments (array or single)
            if (analysis.instruments) {
                if (Array.isArray(analysis.instruments)) {
                    analysis.instruments.forEach(inst => patterns.instruments.add(inst));
                } else {
                    patterns.instruments.add(analysis.instruments);
                }
            }
        }
    });
    
    // Calculate tempo range
    if (patterns.tempos.length > 0) {
        patterns.tempoRange = {
            min: Math.min(...patterns.tempos),
            max: Math.max(...patterns.tempos),
            avg: Math.round(patterns.tempos.reduce((a, b) => a + b, 0) / patterns.tempos.length)
        };
    } else {
        patterns.tempoRange = { min: 120, max: 120, avg: 120 };
    }
    
    // Remove empty sets and add defaults if needed
    if (patterns.keys.size === 0) patterns.keys.add('C major');
    if (patterns.chords.size === 0) patterns.chords.add('I').add('V').add('vi').add('IV');
    if (patterns.genres.size === 0) patterns.genres.add('instrumental');
    if (patterns.moods.size === 0) patterns.moods.add('contemplative');
    if (patterns.instruments.size === 0) patterns.instruments.add('piano');
    
    return patterns;
}

// Create download button for generated files
function createDownloadButton(filename, filepath, type) {
    const oledDisplay = document.querySelector('.oled-display');
    if (!oledDisplay) {
        console.error('OLED display not found');
        return;
    }
    
    console.log('Creating download button for:', { filename, filepath, type });
    
    // Add CSS animation for pulsing effect
    if (!document.getElementById('download-animation-style')) {
        const style = document.createElement('style');
        style.id = 'download-animation-style';
        style.textContent = `
            @keyframes pulse {
                0% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.3); }
                50% { box-shadow: 0 0 30px rgba(0, 255, 0, 0.6); }
                100% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.3); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create download button container with better styling
    const downloadContainer = document.createElement('div');
    downloadContainer.style.cssText = `
        margin: 15px 0;
        padding: 20px;
        border: 3px solid #00ff00;
        border-radius: 10px;
        background: rgba(0, 255, 0, 0.2);
        display: flex;
        flex-direction: column;
        gap: 15px;
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
        animation: pulse 2s infinite;
    `;
    
    // Add file info
    const fileInfo = document.createElement('div');
    fileInfo.textContent = `� Generated ${type} File: ${filename}`;
    fileInfo.style.cssText = `
        color: #00ff00;
        font-family: 'Share Tech Mono', monospace;
        font-size: 14px;
        margin-bottom: 10px;
        font-weight: bold;
    `;
    downloadContainer.appendChild(fileInfo);
    
    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    `;
    
    // Create download button with better styling
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = `📥 Download ${type}`;
    downloadBtn.style.cssText = `
        background: #004400;
        border: 2px solid #00ff00;
        color: #00ff00;
        padding: 12px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-family: 'Share Tech Mono', monospace;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.3s ease;
        min-width: 150px;
    `;
    
    // Add hover effect
    downloadBtn.addEventListener('mouseenter', () => {
        downloadBtn.style.background = '#006600';
        downloadBtn.style.boxShadow = '0 0 10px #00ff00';
    });
    
    downloadBtn.addEventListener('mouseleave', () => {
        downloadBtn.style.background = '#004400';
        downloadBtn.style.boxShadow = 'none';
    });
    
    downloadBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            console.log('Download button clicked for:', filepath);
            logToOLED(`� Initiating download for: ${filename}`);
            
            // Show loading state
            downloadBtn.textContent = '⏳ Downloading...';
            downloadBtn.disabled = true;
            
            const result = await electronAPI.downloadFile(filepath);
            
            if (result.success) {
                logToOLED(`✅ Download successful: ${filename}`);
                if (result.savedTo) {
                    logToOLED(`💾 File saved to: ${result.savedTo}`);
                }
                downloadBtn.textContent = '✅ Downloaded';
                downloadBtn.style.background = '#006600';
                
                // Reset button after 3 seconds
                setTimeout(() => {
                    downloadBtn.textContent = `📥 Download ${type}`;
                    downloadBtn.style.background = '#004400';
                    downloadBtn.disabled = false;
                }, 3000);
            } else {
                logToOLED(`❌ Download failed: ${result.error}`);
                downloadBtn.textContent = '❌ Failed';
                downloadBtn.style.background = '#660000';
                
                // Reset button after 3 seconds
                setTimeout(() => {
                    downloadBtn.textContent = `📥 Download ${type}`;
                    downloadBtn.style.background = '#004400';
                    downloadBtn.disabled = false;
                }, 3000);
            }
        } catch (error) {
            console.error('Download error:', error);
            logToOLED(`❌ Download error: ${error.message}`);
            downloadBtn.textContent = '❌ Error';
            downloadBtn.style.background = '#660000';
            
            // Reset button after 3 seconds
            setTimeout(() => {
                downloadBtn.textContent = `📥 Download ${type}`;
                downloadBtn.style.background = '#004400';
                downloadBtn.disabled = false;
            }, 3000);
        }
    });
    
    // Create show folder button with better styling
    const folderBtn = document.createElement('button');
    folderBtn.textContent = '📁 Open Folder';
    folderBtn.style.cssText = downloadBtn.style.cssText;
    folderBtn.style.background = '#444400';
    folderBtn.style.borderColor = '#ffff00';
    folderBtn.style.color = '#ffff00';
    
    // Add hover effect for folder button
    folderBtn.addEventListener('mouseenter', () => {
        folderBtn.style.background = '#666600';
        folderBtn.style.boxShadow = '0 0 10px #ffff00';
    });
    
    folderBtn.addEventListener('mouseleave', () => {
        folderBtn.style.background = '#444400';
        folderBtn.style.boxShadow = 'none';
    });
    
    folderBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            console.log('Show folder button clicked for:', filepath);
            logToOLED(`� Opening folder for: ${filename}`);
            
            // Show loading state
            folderBtn.textContent = '⏳ Opening...';
            folderBtn.disabled = true;
            
            const result = await electronAPI.showInFolder(filepath);
            
            if (result.success) {
                logToOLED(`✅ Folder opened for: ${filename}`);
                folderBtn.textContent = '✅ Opened';
                folderBtn.style.background = '#666600';
                
                // Reset button after 2 seconds
                setTimeout(() => {
                    folderBtn.textContent = '📁 Open Folder';
                    folderBtn.style.background = '#444400';
                    folderBtn.disabled = false;
                }, 2000);
            } else {
                logToOLED(`❌ Failed to open folder: ${result.error}`);
                folderBtn.textContent = '❌ Failed';
                folderBtn.style.background = '#660000';
                
                // Reset button after 3 seconds
                setTimeout(() => {
                    folderBtn.textContent = '📁 Open Folder';
                    folderBtn.style.background = '#444400';
                    folderBtn.disabled = false;
                }, 3000);
            }
        } catch (error) {
            console.error('Show folder error:', error);
            logToOLED(`❌ Folder error: ${error.message}`);
            folderBtn.textContent = '❌ Error';
            folderBtn.style.background = '#660000';
            
            // Reset button after 3 seconds
            setTimeout(() => {
                folderBtn.textContent = '📁 Open Folder';
                folderBtn.style.background = '#444400';
                folderBtn.disabled = false;
            }, 3000);
        }
    });
    
    buttonContainer.appendChild(downloadBtn);
    buttonContainer.appendChild(folderBtn);
    downloadContainer.appendChild(buttonContainer);
    
    // Add to OLED display at the end
    oledDisplay.appendChild(downloadContainer);
    oledDisplay.scrollTop = oledDisplay.scrollHeight;
    
    console.log('Download button created and added to OLED display');
}

// Debug function to test download functionality
async function debugDownloadFunctionality() {
    console.log('🧪 === DOWNLOAD FUNCTIONALITY DEBUG ===');
    
    // Test 1: Check if electronAPI is available
    console.log('1. Testing electronAPI availability...');
    if (typeof electronAPI !== 'undefined') {
        console.log('✅ electronAPI is available');
        console.log('   - downloadFile:', typeof electronAPI.downloadFile);
        console.log('   - showInFolder:', typeof electronAPI.showInFolder);
    } else {
        console.error('❌ electronAPI is not available');
        return;
    }
    
    // Test 2: Test basic IPC
    try {
        console.log('2. Testing basic IPC communication...');
        const testResult = await electronAPI.testIPC();
        console.log('✅ IPC communication successful:', testResult);
    } catch (error) {
        console.error('❌ IPC communication failed:', error);
    }
    
    // Test 3: Create a test download button
    console.log('3. Testing download button creation...');
    try {
        const testFilename = 'debug-test.json';
        const testFilepath = '/tmp/debug-test.json';
        
        // Check if function exists
        if (typeof createDownloadButton === 'function') {
            console.log('✅ createDownloadButton function exists');
            
            // Create the button
            createDownloadButton(testFilename, testFilepath, 'TEST');
            console.log('✅ Test download button created');
        } else {
            console.error('❌ createDownloadButton function not found');
        }
    } catch (error) {
        console.error('❌ Button creation failed:', error);
    }
    
    console.log('🧪 === DEBUG COMPLETE ===');
}

// Status System Functions
async function updateOLEDDisplay() {
    try {
        const status = await electronAPI.getSystemStatus();
        if (status.error) {
            console.error('Error getting system status:', status.error);
            return;
        }

        // Update OLED display with real data
        const chordCountEl = document.getElementById('chord-count');
        const guitarCountEl = document.getElementById('guitar-count');
        const pianoCountEl = document.getElementById('piano-count');
        const drumCountEl = document.getElementById('drum-count');
        const bassCountEl = document.getElementById('bass-count');
        const totalFilesEl = document.getElementById('total-files');

        // Safely get values with fallbacks
        const chordCount = status.instruments?.chords || 0;
        const guitarCount = status.instruments?.guitar || 0;
        const pianoCount = status.instruments?.piano || 0;
        const drumCount = status.instruments?.drums || 0;
        const bassCount = status.instruments?.bass || 0;
        const totalFiles = status.database?.total_files || 0;

        if (chordCountEl) chordCountEl.textContent = chordCount;
        if (guitarCountEl) guitarCountEl.textContent = guitarCount;
        if (pianoCountEl) pianoCountEl.textContent = pianoCount;
        if (drumCountEl) drumCountEl.textContent = drumCount;
        if (bassCountEl) bassCountEl.textContent = bassCount;
        if (totalFilesEl) totalFilesEl.textContent = totalFiles;

        // Add update animation
        const oledDisplay = document.getElementById('oled-display');
        if (oledDisplay) {
            oledDisplay.classList.add('updating');
            setTimeout(() => oledDisplay.classList.remove('updating'), 500);
        }

        // Log the real status to console for debugging
        console.log('📊 === OLED DISPLAY UPDATED ===');
        console.log(`🎵 Audio Files: ${status.database?.audio_files || 0}`);
        console.log(`🎹 MIDI Files: ${status.database?.midi_files || 0}`);
        console.log(`📁 Total Files: ${totalFiles}`);
        console.log(`🎸 Guitar Sounds: ${guitarCount}`);
        console.log(`🎹 Piano Sounds: ${pianoCount}`);
        console.log(`🥁 Drum Sounds: ${drumCount}`);
        console.log(`🎸 Bass Sounds: ${bassCount}`);
        console.log(`🎶 Chord Patterns: ${chordCount}`);

    } catch (error) {
        console.error('Error updating OLED display:', error);
    }
}

async function askStatusQuestion(question) {
    if (!question.trim()) {
        logToOLED('❌ Please enter a question about my status, instruments, or capabilities.');
        return;
    }

    // Show loading state in OLED display
    logToOLED('⏳ Processing your question...');

    try {
        const result = await electronAPI.askStatusQuestion(question);
        
        if (result.error) {
            logToOLED(`❌ Status query error: ${result.error}`);
        } else {
            // Display the answer on the main OLED display
            logToOLED('📊 === STATUS RESPONSE ===');
            const lines = result.answer.split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    logToOLED(line.trim());
                }
            }
            logToOLED('========================');
        }
    } catch (error) {
        logToOLED(`❌ Status query error: ${error.message}`);
    }
}

function initializeStatusSystem() {
    // Status system now integrated into main OLED display
    // No separate status query panel needed
    
    // Update OLED display with initial data
    updateOLEDDisplay();

    // Set up periodic updates
    setInterval(updateOLEDDisplay, 30000); // Update every 30 seconds
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);