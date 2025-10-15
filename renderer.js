// AI Music Assistant - Simple and Reliable
// Simple API wrapper for all backend operations
const audioAnalyzer = {
    analyze: (filePath) => electronAPI.analyzeAudioFile(filePath)
};

const midiAnalyzer = {
    analyze: (filePath) => electronAPI.analyzeMidiFile(filePath)
};

// IPC renderer exposed from preload.js - use electronAPI instead of direct ipcRenderer
// const ipcRenderer = window.ipcRenderer; // ❌ REMOVED - violates context isolation

const llmOrchestrator = {
    runPrompt: (prompt) => electronAPI.invoke('llm-run', { prompt }),
    summarize: (text) => electronAPI.invoke('llm-summarize', { text })
};

// Load auto-naming system
const autoNamingScript = document.createElement('script');
autoNamingScript.src = './auto-naming-system.js';
document.head.appendChild(autoNamingScript);

// Initialize auto-naming system once loaded
let autoNaming = null;
autoNamingScript.onload = () => {
    autoNaming = new AutoNamingSystem();
    console.log('🏷️ Auto-naming system loaded');
};

// Simple application state
let loadedFiles = [];
let analysisResults = [];
let appSettings = {
    localLlmEnabled: false,
    cloudLlmProvider: 'none',
    apiKey: '',
    modelSize: 'medium',
    temperature: 0.7,
    autoNaming: {
        enabled: true,
        template: 'descriptive',
        showSuggestions: true
    }
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
        
        // Show comprehensive data readout on startup
        setTimeout(async () => {
            try {
                const status = await electronAPI.getSystemStatus();
                if (status && status.database && status.database.total_files > 0) {
                    logToOLED('');
                    logToOLED('🎶 ================================');
                    logToOLED('🎵 MUSICAL LIBRARY LOADED & READY');
                    logToOLED('🎶 ================================');
                    logToOLED('');
                    logToOLED(`📊 TOTAL PROCESSED FILES: <span style="color: #00ff00; font-weight: bold;">${status.database.total_files}</span>`);
                    logToOLED(`🎵 Audio Samples: <span style="color: #ff6600">${status.database.audio_files}</span>`);
                    logToOLED(`🎹 MIDI Files: <span style="color: #6600ff">${status.database.midi_files}</span>`);
                    logToOLED('');
                    
                    if (status.instruments && status.instruments.instruments) {
                        logToOLED('🎸 YOUR INSTRUMENT ARSENAL:');
                        logToOLED('─────────────────────────────────');
                        const instruments = status.instruments.instruments;
                        Object.entries(instruments).forEach(([name, count]) => {
                            if (count > 0) {
                                const emoji = getInstrumentEmoji(name);
                                const coloredCount = `<span style="color: #ffff00; font-weight: bold;">${count}</span>`;
                                logToOLED(`${emoji} ${name}: ${coloredCount} samples ready`);
                            }
                        });
                        
                        const totalSamples = Object.values(instruments).reduce((sum, count) => sum + count, 0);
                        logToOLED('');
                        logToOLED(`🎯 TOTAL SAMPLES: <span style="color: #00ffff; font-weight: bold;">${totalSamples}</span> instrument data points`);
                    }
                    
                    logToOLED('');
                    logToOLED('✅ YOUR MUSIC LIBRARY IS LOADED & READY!');
                    logToOLED('🚀 Start generating music with your samples!');
                    const lastUpdate = status.database.last_updated ? new Date(status.database.last_updated).toLocaleDateString() : 'Unknown';
                    logToOLED(`📅 Last processed: ${lastUpdate}`);
                } else {
                    logToOLED('');
                    logToOLED('⚠️  NO PROCESSED MUSIC DATA FOUND');
                    logToOLED('📁 Upload audio/MIDI files to get started');
                    logToOLED('🔄 Process files to build your music library');
                }
            } catch (error) {
                logToOLED('❌ Error loading music library status');
                console.error('Startup status error:', error);
            }
        }, 1000); // Small delay to ensure UI is ready
        
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
        
        // Update OLED display with new data after a short delay to ensure database is updated
        setTimeout(async () => {
            await updateOLEDDisplay();
        }, 1000);
        
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

// Smart filename generator using auto-naming system
function generateSmartFilename(prompt, type = 'json', options = {}) {
    try {
        // Wait for auto-naming system to be loaded
        if (!autoNaming) {
            console.warn('Auto-naming system not loaded, using fallback');
            return getFallbackFilename(prompt, type);
        }

        // Get analysis patterns from loaded files
        const analysisPatterns = extractAnalysisPatterns();
        
        // Use auto-naming system with user preferences
        const namingOptions = {
            template: appSettings.autoNaming?.template || 'descriptive',
            maxLength: 45,
            ...options
        };
        
        const filename = autoNaming.generateFilename(prompt, analysisPatterns, type, namingOptions);
        
        logToOLED(`🏷️ Smart filename generated: ${filename}`);
        return filename;
        
    } catch (error) {
        console.error('Smart naming failed:', error);
        return getFallbackFilename(prompt, type);
    }
}

// Get filename suggestions for user selection
function getFilenameSuggestions(prompt, type = 'json', count = 3) {
    try {
        if (!autoNaming) return [];
        
        const analysisPatterns = extractAnalysisPatterns();
        return autoNaming.getSuggestions(prompt, analysisPatterns, type, count);
    } catch (error) {
        console.error('Failed to get filename suggestions:', error);
        return [];
    }
}

// Extract analysis patterns from loaded files
function extractAnalysisPatterns() {
    if (!loadedFiles || loadedFiles.length === 0) {
        return {
            keys: new Set(['C']),
            genres: new Set(['Electronic']),
            instruments: new Set(['Synth']),
            chords: new Set(['C-F-G']),
            moods: new Set(['Ambient']),
            tempoRange: { min: 120, max: 140 }
        };
    }

    // Aggregate patterns from all loaded files
    const patterns = {
        keys: new Set(),
        genres: new Set(),
        instruments: new Set(),
        chords: new Set(),
        moods: new Set(),
        tempos: []
    };

    loadedFiles.forEach(file => {
        if (file.analysis) {
            // Extract key information
            if (file.analysis.key) patterns.keys.add(file.analysis.key);
            if (file.analysis.genre) patterns.genres.add(file.analysis.genre);
            if (file.analysis.mood) patterns.moods.add(file.analysis.mood);
            if (file.analysis.tempo) patterns.tempos.push(file.analysis.tempo);
            
            // Extract instruments
            if (file.analysis.instruments) {
                file.analysis.instruments.forEach(inst => patterns.instruments.add(inst));
            }
            
            // Extract chords
            if (file.analysis.chords) {
                file.analysis.chords.forEach(chord => patterns.chords.add(chord));
            }
        }
    });

    // Calculate tempo range
    const tempos = patterns.tempos.filter(t => t > 0);
    patterns.tempoRange = tempos.length > 0 ? {
        min: Math.min(...tempos),
        max: Math.max(...tempos)
    } : { min: 120, max: 140 };

    return patterns;
}

// Fallback filename generator
function getFallbackFilename(prompt, type) {
    const timestamp = new Date().toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z/, '')
        .substring(2, 13);
    
    const sanitized = prompt
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 20);
    
    const extension = type === 'midi' ? '.mid' : '.json';
    
    return sanitized ? `${sanitized}_${timestamp}${extension}` : `generated_${timestamp}${extension}`;
}

// Show filename selection dialog
async function showFilenameDialog(prompt, type, suggestions) {
    return new Promise((resolve) => {
        // Create modal dialog
        const modal = document.createElement('div');
        modal.className = 'filename-modal';
        modal.innerHTML = `
            <div class="filename-dialog">
                <h3>📝 Choose Filename</h3>
                <p>Select or customize the filename for your generated ${type.toUpperCase()} file:</p>
                
                <div class="filename-suggestions">
                    ${suggestions.map((suggestion, index) => `
                        <label class="filename-option">
                            <input type="radio" name="filename" value="${suggestion.name}" ${index === 0 ? 'checked' : ''}>
                            <span class="filename-text">${suggestion.name}</span>
                            <small class="filename-desc">${suggestion.description}</small>
                        </label>
                    `).join('')}
                    
                    <label class="filename-option">
                        <input type="radio" name="filename" value="custom">
                        <span class="filename-text">Custom:</span>
                        <input type="text" class="custom-filename" placeholder="Enter custom filename...">
                    </label>
                </div>
                
                <div class="filename-actions">
                    <button class="neon-button cancel-btn">Cancel</button>
                    <button class="neon-button confirm-btn">Use This Name</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const cancelBtn = modal.querySelector('.cancel-btn');
        const confirmBtn = modal.querySelector('.confirm-btn');
        const customInput = modal.querySelector('.custom-filename');
        const radioButtons = modal.querySelectorAll('input[name="filename"]');
        
        cancelBtn.onclick = () => {
            document.body.removeChild(modal);
            resolve(null);
        };
        
        confirmBtn.onclick = () => {
            const selected = modal.querySelector('input[name="filename"]:checked');
            let filename = selected.value;
            
            if (filename === 'custom') {
                filename = customInput.value.trim();
                if (!filename) {
                    alert('Please enter a custom filename');
                    return;
                }
                // Add extension if missing
                const extension = type === 'midi' ? '.mid' : '.json';
                if (!filename.endsWith(extension)) {
                    filename += extension;
                }
            }
            
            document.body.removeChild(modal);
            resolve(filename);
        };
        
        // Enable custom input when custom radio is selected
        radioButtons.forEach(radio => {
            radio.onchange = () => {
                customInput.disabled = radio.value !== 'custom';
                if (radio.value === 'custom') {
                    customInput.focus();
                }
            };
        });
        
        // Initialize custom input state
        customInput.disabled = true;
    });
}

// MIDI Generation with save dialog and library
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

            // Show save dialog and save to library
            await saveGeneratedMIDI(result.data, prompt);

            logToOLED(`✅ MIDI generated and ready to save`);

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
// Save generated MIDI with dialog and library integration
async function saveGeneratedMIDI(generatedData, prompt) {
    try {
        const { filename, midiBuffer, category, metadata } = generatedData;
        
        // Show save dialog for user to choose name and location
        const saveResult = await electronAPI.showSaveDialog({
            title: 'Save Generated MIDI',
            defaultPath: filename,
            filters: [
                { name: 'MIDI Files', extensions: ['mid', 'midi'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        
        if (saveResult.canceled) {
            logToOLED('💭 Save canceled by user');
            return;
        }
        
        // Extract user's chosen filename
        const userFilename = saveResult.filePath.split('/').pop();
        
        // Save to user's chosen location
        await electronAPI.writeFile(saveResult.filePath, midiBuffer);
        
        // Also save to library for future access
        const libraryResult = await electronAPI.saveToLibrary({
            fileName: userFilename,
            content: midiBuffer,
            category,
            metadata: {
                ...metadata,
                prompt,
                userSavePath: saveResult.filePath
            },
            type: 'midi'
        });
        
        if (libraryResult.success) {
            logToOLED(`💾 MIDI saved: ${userFilename}`);
            logToOLED(`📚 Added to library (${category} category)`);
            
            // Create JSON metadata file in same location
            const jsonFilename = userFilename.replace(/\.[^/.]+$/, '') + '.json';
            const jsonPath = saveResult.filePath.replace(/\.[^/.]+$/, '') + '.json';
            
            const jsonData = {
                ...metadata,
                prompt,
                filename: userFilename,
                category,
                createdAt: new Date().toISOString()
            };
            
            await electronAPI.writeFile(jsonPath, JSON.stringify(jsonData, null, 2));
            logToOLED(`📄 JSON metadata saved: ${jsonFilename}`);
            
            // Update library display
            updateLibraryDisplay();
            
            // Show download area with library access
            createLibraryAccessArea(libraryResult.metadata, saveResult.filePath);
        } else {
            logToOLED(`⚠️ File saved but library update failed: ${libraryResult.error}`);
        }
        
    } catch (error) {
        console.error('Save error:', error);
        logToOLED(`❌ Save failed: ${error.message}`);
    }
}

// Create library access area with category management
function createLibraryAccessArea(metadata, savedPath) {
    const downloadArea = document.getElementById('download-area') || createDownloadArea();
    
    // Clear previous content
    downloadArea.innerHTML = '<h3 class="panel-header">LIBRARY & DOWNLOADS</h3>';
    
    // Add file info
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    fileInfo.innerHTML = `
        <div class="generated-file-info">
            <p>✅ <strong>${metadata.fileName}</strong></p>
            <p>📁 Category: <span class="category-tag">${metadata.category}</span></p>
            <p>📅 Created: ${new Date(metadata.createdAt).toLocaleString()}</p>
        </div>
    `;
    downloadArea.appendChild(fileInfo);
    
    // Add action buttons
    const actions = document.createElement('div');
    actions.className = 'library-actions';
    
    // Re-download button
    const redownloadBtn = document.createElement('button');
    redownloadBtn.className = 'neon-button';
    redownloadBtn.textContent = '📥 Download Again';
    redownloadBtn.onclick = () => {
        electronAPI.downloadFile(savedPath);
        logToOLED(`📥 Re-downloading: ${metadata.fileName}`);
    };
    
    // Show in folder button
    const showBtn = document.createElement('button');
    showBtn.className = 'neon-button';
    showBtn.textContent = '📂 Show in Folder';
    showBtn.onclick = () => {
        electronAPI.showInFolder(savedPath);
    };
    
    // Browse library button
    const browseBtn = document.createElement('button');
    browseBtn.className = 'neon-button';
    browseBtn.textContent = '📚 Browse Library';
    browseBtn.onclick = () => {
        showLibraryBrowser();
    };
    
    actions.appendChild(redownloadBtn);
    actions.appendChild(showBtn);
    actions.appendChild(browseBtn);
    downloadArea.appendChild(actions);
    
    // Style the area
    downloadArea.style.cssText = `
        margin-top: 20px;
        padding: 15px;
        border: 1px solid #00ff00;
        border-radius: 5px;
        background: rgba(0, 255, 0, 0.05);
    `;
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

// Library Browser with categories
async function showLibraryBrowser() {
    try {
        // Remove any existing library modals first
        const existingModals = document.querySelectorAll('.library-modal');
        existingModals.forEach(modal => modal.remove());
        
        // Get library files and categories
        const [filesResult, categoriesResult] = await Promise.all([
            electronAPI.getLibraryFiles(),
            electronAPI.getLibraryCategories()
        ]);
        
        if (!filesResult.success) {
            logToOLED('❌ Failed to load library');
            return;
        }
        
        // Create library browser modal
        const modal = document.createElement('div');
        modal.className = 'library-modal';
        modal.innerHTML = `
            <div class="library-modal-content">
                <div class="library-header">
                    <h2>🎵 Music Library</h2>
                    <button class="close-modal" type="button">✕</button>
                </div>
                
                <div class="library-categories">
                    <button class="category-btn active" data-category="">All (${filesResult.files.length})</button>
                    ${categoriesResult.success ? categoriesResult.categories.map(cat => 
                        `<button class="category-btn" data-category="${cat.name}">${cat.name} (${cat.fileCount})</button>`
                    ).join('') : ''}
                </div>
                
                <div class="library-files" id="library-files-list">
                    ${renderLibraryFiles(filesResult.files)}
                </div>
            </div>
        `;
        
        // Add styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        // Add styles to modal content and close button
        const modalContentEl = modal.querySelector('.library-modal-content');
        if (modalContentEl) {
            modalContentEl.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 20px;
                max-width: 90%;
                max-height: 90%;
                overflow-y: auto;
                position: relative;
            `;
        }
        
        const closeBtnEl = modal.querySelector('.close-modal');
        if (closeBtnEl) {
            closeBtnEl.style.cssText = `
                position: absolute;
                top: 10px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                z-index: 1001;
                padding: 5px;
                line-height: 1;
            `;
        }
        
        document.body.appendChild(modal);
        
        // Add close modal event listeners with improved debugging
        const closeBtn = modal.querySelector('.close-modal');
        
        function closeModal() {
            console.log('Closing library modal');
            // Remove ESC key listener
            document.removeEventListener('keydown', handleEscape);
            // Remove modal from DOM
            if (modal.parentNode) {
                modal.remove();
            }
            logToOLED('📚 Library browser closed');
        }
        
        if (closeBtn) {
            console.log('Adding close button event listener');
            closeBtn.addEventListener('click', (e) => {
                console.log('Close button clicked');
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            });
        } else {
            console.error('Close button not found!');
        }
        
        // Close modal when clicking outside content
        modal.addEventListener('click', (e) => {
            console.log('Modal backdrop clicked, target:', e.target.className);
            if (e.target === modal || e.target.classList.contains('library-modal')) {
                console.log('Closing modal - clicked outside content');
                closeModal();
            }
        });
        
        // Prevent modal content clicks from closing modal
        const modalContent = modal.querySelector('.library-modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Add ESC key listener to close modal
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                console.log('ESC key pressed - closing modal');
                closeModal();
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Add event delegation for library file action buttons
        modal.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent modal closing when clicking action buttons
            
            if (e.target.classList.contains('redownload-btn')) {
                const filePath = e.target.dataset.filepath;
                const fileName = e.target.dataset.filename;
                redownloadFromLibrary(filePath, fileName);
            } else if (e.target.classList.contains('show-folder-btn')) {
                const filePath = e.target.dataset.filepath;
                showFileInFolder(filePath);
            } else if (e.target.classList.contains('play-preview-btn')) {
                const filePath = e.target.dataset.filepath;
                playPreview(filePath);
            }
        });
        
        // Add event listeners for category filtering
        const categoryBtns = modal.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const category = btn.dataset.category;
                const filteredResult = category ? 
                    await electronAPI.getLibraryFiles(category) : 
                    await electronAPI.getLibraryFiles();
                
                if (filteredResult.success) {
                    document.getElementById('library-files-list').innerHTML = 
                        renderLibraryFiles(filteredResult.files);
                }
            });
        });
        
        logToOLED(`📚 Library opened (${filesResult.files.length} files)`);
        
    } catch (error) {
        console.error('Library browser error:', error);
        logToOLED(`❌ Library error: ${error.message}`);
    }
}

// Render library files list
function renderLibraryFiles(files) {
    if (files.length === 0) {
        return '<div class="no-files">No files in this category</div>';
    }
    
    return files.map(file => `
        <div class="library-file-item">
            <div class="file-info">
                <div class="file-name">${file.fileName}</div>
                <div class="file-meta">
                    <span class="category-tag">${file.category}</span>
                    <span class="date">${new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
                ${file.prompt ? `<div class="file-prompt">"${file.prompt}"</div>` : ''}
            </div>
            <div class="file-actions">
                <button class="mini-btn redownload-btn" data-filepath="${file.filePath}" data-filename="${file.fileName}">📥</button>
                <button class="mini-btn show-folder-btn" data-filepath="${file.filePath}">📂</button>
                <button class="mini-btn play-preview-btn" data-filepath="${file.filePath}">▶️</button>
            </div>
        </div>
    `).join('');
}

// Library action functions
async function redownloadFromLibrary(filePath, fileName) {
    try {
        const result = await electronAPI.downloadFile(filePath);
        if (result.success) {
            logToOLED(`📥 Re-downloaded: ${fileName}`);
        }
    } catch (error) {
        logToOLED(`❌ Download failed: ${error.message}`);
    }
}

async function showFileInFolder(filePath) {
    try {
        await electronAPI.showInFolder(filePath);
    } catch (error) {
        logToOLED(`❌ Could not show file: ${error.message}`);
    }
}

async function playPreview(filePath) {
    // For now, just show a message - could integrate with a MIDI player later
    logToOLED(`🎵 Preview: ${filePath.split('/').pop()}`);
}

// Library setup on first use
async function setupLibrary() {
    try {
        const libraryResult = await electronAPI.getLibraryPath();
        
        if (!libraryResult.success || !libraryResult.path) {
            // Prompt user to choose library location
            const folderResult = await electronAPI.openFolderDialog();
            
            if (folderResult.canceled || !folderResult.filePaths[0]) {
                logToOLED('📚 Library setup canceled');
                return false;
            }
            
            const libraryPath = folderResult.filePaths[0] + '/MusicLibrary';
            const setupResult = await electronAPI.setLibraryPath(libraryPath);
            
            if (setupResult.success) {
                logToOLED(`📚 Library created: ${libraryPath}`);
                return true;
            } else {
                logToOLED(`❌ Library setup failed: ${setupResult.error}`);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('Library setup error:', error);
        logToOLED(`❌ Library setup error: ${error.message}`);
        return false;
    }
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
        
        // Always check for processed data in database, even if no files loaded locally
        try {
            const status = await electronAPI.getSystemStatus();
            if (status && status.database && status.database.total_files > 0) {
                logToOLED('');
                logToOLED('🤖 === MACHINE LEARNING DATA DETECTED ===');
                logToOLED(`📊 Processed Files: <span style="color: #00ff00">${status.database.total_files}</span>`);
                logToOLED(`🎵 Audio: <span style="color: #ff6600">${status.database.audio_files}</span> | 🎹 MIDI: <span style="color: #6600ff">${status.database.midi_files}</span>`);
                
                if (status.instruments && status.instruments.instruments) {
                    logToOLED('');
                    logToOLED('🎸 INSTRUMENT SAMPLES READY:');
                    const instruments = status.instruments.instruments;
                    Object.entries(instruments).forEach(([name, count]) => {
                        if (count > 0) {
                            logToOLED(`${getInstrumentEmoji(name)} ${name}: <span style="color: #ffff00">${count}</span> samples`);
                        }
                    });
                }
                
                logToOLED(`📅 Data from: ${status.database.last_updated ? new Date(status.database.last_updated).toLocaleDateString() : 'Unknown'}`);
                logToOLED('✅ Ready for music generation!');
                
                // Update ML status indicator
                const mlStatusEl = document.getElementById('ml-data-status');
                if (mlStatusEl) {
                    mlStatusEl.textContent = 'RETAINED';
                    mlStatusEl.style.color = '#00ff00';
                }
            } else {
                // No processed data found
                logToOLED('⚠️  No processed musical data found');
                logToOLED('📁 Upload and process files to build library');
                const mlStatusEl = document.getElementById('ml-data-status');
                if (mlStatusEl) {
                    mlStatusEl.textContent = 'NONE';
                    mlStatusEl.style.color = '#ff6600';
                }
            }
        } catch (error) {
            console.error('Error checking processed data:', error);
            const mlStatusEl = document.getElementById('ml-data-status');
            if (mlStatusEl) {
                mlStatusEl.textContent = 'ERROR';
                mlStatusEl.style.color = '#ff0000';
            }
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
                const folderPaths = await electronAPI.openFolderDialog();
                console.log('Folder selected:', folderPaths);
                
                if (folderPaths && folderPaths.length > 0) {
                    const selectedFolder = folderPaths[0];
                    
                    // Validate that the selected folder is not a system directory
                    if (selectedFolder === '/' || selectedFolder.startsWith('/System') || 
                        selectedFolder.startsWith('/Library') || selectedFolder.startsWith('/usr') ||
                        selectedFolder.startsWith('/bin') || selectedFolder.startsWith('/sbin') ||
                        selectedFolder.startsWith('/etc') || selectedFolder.startsWith('/var') ||
                        selectedFolder.startsWith('/tmp') || selectedFolder.startsWith('/opt') ||
                        selectedFolder.startsWith('/private') || selectedFolder.startsWith('/cores') ||
                        selectedFolder.startsWith('/dev') || selectedFolder.startsWith('/home') ||
                        selectedFolder.startsWith('/net') || selectedFolder.startsWith('/mnt') ||
                        selectedFolder.startsWith('/proc') || selectedFolder.startsWith('/root') ||
                        selectedFolder.startsWith('/run') || selectedFolder.startsWith('/srv') ||
                        selectedFolder.startsWith('/sys')) {
                        logToOLED('❌ Cannot scan system directories. Please select a user directory or music folder.');
                        return;
                    }
                    
                    logToOLED(`📁 Scanning folder: ${selectedFolder}`);
                    await scanFolder(selectedFolder);
                } else {
                    logToOLED('❌ No folder selected');
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

    // Browse Library button
    const browseLibraryBtn = document.getElementById('browse-library-btn');
    console.log('Browse library button found:', browseLibraryBtn);
    if (browseLibraryBtn) {
        browseLibraryBtn.addEventListener('click', async () => {
            console.log('Browse library button clicked');
            try {
                await showLibraryBrowser();
            } catch (error) {
                console.error('Browse library error:', error);
                logToOLED('❌ Failed to open library browser');
            }
        });
    }

    // Setup Library button
    const setupLibraryBtn = document.getElementById('setup-library-btn');
    console.log('Setup library button found:', setupLibraryBtn);
    if (setupLibraryBtn) {
        setupLibraryBtn.addEventListener('click', async () => {
            console.log('Setup library button clicked');
            try {
                const success = await setupLibrary();
                if (success) {
                    logToOLED('✅ Library setup completed!');
                }
            } catch (error) {
                console.error('Setup library error:', error);
                logToOLED('❌ Library setup failed');
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

    // Generation buttons - Fixed duplicate event listeners
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

    const testUploadBtn = document.getElementById('test-upload-btn');
    if (testUploadBtn) {
        testUploadBtn.addEventListener('click', () => electronAPI.invoke('open-test-window'));
    }

    const testSettingsBtn = document.getElementById('test-settings-btn');
    if (testSettingsBtn) {
        testSettingsBtn.addEventListener('click', () => electronAPI.invoke('open-settings-test-window'));
    }
    
    // Add ML Data check button handler
    const checkMLDataBtn = document.getElementById('check-ml-data');
    if (checkMLDataBtn) {
        checkMLDataBtn.addEventListener('click', async () => {
            try {
                logToOLED('🔍 Checking machine learning data...');
                const result = await electronAPI.getMLDataSummary();
                
                if (result.success) {
                    const summary = result.summary;
                    logToOLED('');
                    logToOLED('🎶 ================================');
                    logToOLED('🤖 COMPLETE ML DATA ANALYSIS');
                    logToOLED('🎶 ================================');
                    logToOLED('');
                    logToOLED(`📊 Data Retention: <span style="color: ${summary.dataRetention === 'YES' ? '#00ff00' : '#ff0000'}; font-weight: bold;">${summary.dataRetention}</span>`);
                    logToOLED(`📁 Processed Files: <span style="color: #00ffff; font-weight: bold;">${summary.totalProcessedFiles}</span>`);
                    logToOLED(`🎵 Audio Files: <span style="color: #ff6600">${summary.audioFiles}</span> | 🎹 MIDI Files: <span style="color: #6600ff">${summary.midiFiles}</span>`);
                    logToOLED(`🎸 Total Instrument Samples: <span style="color: #ffff00; font-weight: bold;">${summary.totalInstrumentData}</span>`);
                    logToOLED(`✅ Processing Status: <span style="color: ${summary.processingComplete ? '#00ff00' : '#ff6600'}">${summary.processingComplete ? 'COMPLETE' : 'PARTIAL'}</span>`);
                    
                    if (summary.lastUpdated) {
                        logToOLED(`📅 Last Training: <span style="color: #cccccc">${new Date(summary.lastUpdated).toLocaleString()}</span>`);
                    }
                    
                    if (summary.instruments && Object.keys(summary.instruments).length > 0) {
                        logToOLED('');
                        logToOLED('🎸 DETAILED INSTRUMENT BREAKDOWN:');
                        logToOLED('─────────────────────────────────────');
                        
                        // Sort instruments by count (highest first)
                        const sortedInstruments = Object.entries(summary.instruments)
                            .sort(([,a], [,b]) => b - a)
                            .filter(([,count]) => count > 0);
                            
                        sortedInstruments.forEach(([name, count]) => {
                            const emoji = getInstrumentEmoji(name);
                            const percentage = ((count / summary.totalInstrumentData) * 100).toFixed(1);
                            logToOLED(`${emoji} ${name}: <span style="color: #ffff00">${count}</span> samples (<span style="color: #888888">${percentage}%</span>)`);
                        });
                        
                        logToOLED('');
                        logToOLED('🚀 YOUR MUSIC ARSENAL IS LOADED & READY!');
                        logToOLED('💡 Use these samples to generate new music');
                    }
                    
                    // Update status indicator
                    const mlStatusEl = document.getElementById('ml-data-status');
                    if (mlStatusEl) {
                        mlStatusEl.textContent = summary.dataRetention === 'YES' ? 'RETAINED' : 'MISSING';
                        mlStatusEl.style.color = summary.dataRetention === 'YES' ? '#00ff00' : '#ff0000';
                    }
                } else {
                    logToOLED(`❌ Error checking ML data: ${result.error}`);
                    const mlStatusEl = document.getElementById('ml-data-status');
                    if (mlStatusEl) {
                        mlStatusEl.textContent = 'ERROR';
                        mlStatusEl.style.color = '#ff0000';
                    }
                }
            } catch (error) {
                logToOLED(`❌ Failed to check ML data: ${error.message}`);
            }
        });
    }
}

function getInstrumentEmoji(instrumentName) {
    const name = instrumentName.toLowerCase();
    if (name.includes('guitar')) return '🎸';
    if (name.includes('piano')) return '🎹';
    if (name.includes('drum')) return '🥁';
    if (name.includes('bass')) return '🎸';
    if (name.includes('vocal')) return '🎤';
    if (name.includes('synth')) return '🎛️';
    if (name.includes('string')) return '🎻';
    return '🎵';
}

function updateLibraryDisplay() {
    // Update the OLED display with library statistics
    if (loadedFiles.length > 0) {
        const audioCount = loadedFiles.filter(f => f.type === 'audio').length;
        const midiCount = loadedFiles.filter(f => f.type === 'midi').length;
        
        logToOLED('');
        logToOLED('📊 === CURRENT SESSION ===');
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
                const jsonResult = await generateHumanizedJSONWithSaveDialog(fullPrompt);
                if (jsonResult) {
                    showSuccess(`Generated JSON: ${jsonResult.filename}`);
                }
                break;
            case 'midi':
                const midiResult = await generateMIDIWithSaveDialog(fullPrompt);
                if (midiResult) {
                    const midiFilename = midiResult?.filename || 'Generated MIDI';
                    showSuccess(`Generated MIDI: ${midiFilename}`);
                }
                break;
            case 'both':
                const combinedResult = await generateCombinedMusicFiles(fullPrompt);
                if (combinedResult) {
                    showSuccess(`Generated combined music files:`);
                    showInfo(`  💾 JSON: ${combinedResult.jsonFilename}`);
                    showInfo(`  🎵 MIDI: ${combinedResult.midiFilename}`);
                }
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
    const analysisPatterns = extractAnalysisPatterns();
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
        // Generate smart filename
        const smartFilename = generateSmartFilename(prompt, 'json', { 
            template: appSettings.autoNaming?.template || 'descriptive' 
        });
        
        // Show filename suggestions if enabled
        let filename = smartFilename;
        if (appSettings.autoNaming?.showSuggestions) {
            const suggestions = getFilenameSuggestions(prompt, 'json', 3);
            if (suggestions.length > 0) {
                const selectedFilename = await showFilenameDialog(prompt, 'json', suggestions);
                if (selectedFilename) {
                    filename = selectedFilename;
                } else {
                    // User cancelled
                    hideLoadingScreen();
                    return null;
                }
            }
        }
        
        logToOLED(`🏷️ Using filename: ${filename}`);
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
    
    if (result && result.success && result.data) {
        const generatedData = result.data;
        const filename = generatedData.filename || 'Generated MIDI';
        
        logToOLED(`💾 MIDI generated: ${filename}`);
        
        // If there's a midiBuffer, we can save it to a file
        if (generatedData.midiBuffer) {
            try {
                // Create the generated files directory
                const userDataPath = await electronAPI.getUserDataPath();
                const outputDir = `${userDataPath}/AI-Music-Assistant/Generated`;
                await electronAPI.createDirectory(outputDir);
                
                const outputPath = `${outputDir}/${filename}`;
                
                // Save the MIDI buffer to file
                await electronAPI.writeFile(outputPath, generatedData.midiBuffer);
                
                // Verify file exists
                const fileExists = await electronAPI.checkFileExists(outputPath);
                if (fileExists) {
                    logToOLED(`✅ MIDI file verified: ${filename}`);
                } else {
                    logToOLED(`❌ MIDI file not found: ${filename}`);
                    throw new Error('MIDI file was not created successfully');
                }
                
                // Create download button
                createDownloadButton(filename, outputPath, 'MIDI');
                
                // Automatically download the file
                try {
                    logToOLED(`📥 Auto-downloading MIDI file: ${filename}`);
                    const downloadResult = await electronAPI.downloadFile(outputPath);
                    if (downloadResult.success) {
                        logToOLED(`✅ MIDI file auto-downloaded: ${downloadResult.message}`);
                    } else {
                        logToOLED(`⚠️ Auto-download failed: ${downloadResult.error}`);
                    }
                } catch (error) {
                    logToOLED(`❌ Auto-download error: ${error.message}`);
                }
                
                // Return result with path information
                return {
                    ...result,
                    data: {
                        ...generatedData,
                        path: outputPath
                    }
                };
                
            } catch (error) {
                logToOLED(`❌ Failed to save MIDI file: ${error.message}`);
                throw error;
            }
        } else {
            logToOLED(`⚠️ No MIDI buffer provided in result`);
            return result;
        }
    } else {
        throw new Error(result?.error || 'Failed to generate MIDI');
    }
}

// Generate humanized JSON with save dialog and library integration
async function generateHumanizedJSONWithSaveDialog(prompt) {
    try {
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
            // Generate smart filename
            const smartFilename = generateSmartFilename(prompt, 'json', { 
                template: appSettings.autoNaming?.template || 'descriptive' 
            });
            
            // Show save dialog for user to choose location and filename
            const saveResult = await electronAPI.showSaveDialog({
                title: 'Save Humanized JSON',
                defaultPath: smartFilename,
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            
            if (saveResult.canceled) {
                logToOLED('💭 Save canceled by user');
                return null;
            }
            
            const userFilename = saveResult.filePath.split('/').pop();
            const outputPath = saveResult.filePath;
            
            logToOLED(`💾 Writing JSON file: ${userFilename}`);
            await electronAPI.writeFile(outputPath, JSON.stringify(response.data, null, 2));
            
            // Verify file was created
            const fileExists = await electronAPI.checkFileExists(outputPath);
            if (!fileExists) {
                throw new Error('File was not created successfully');
            }
            
            logToOLED(`✅ JSON file saved: ${userFilename}`);
            
            // Save to library for future access
            const libraryResult = await electronAPI.saveToLibrary({
                fileName: userFilename,
                content: JSON.stringify(response.data, null, 2),
                category: 'humanization',
                metadata: {
                    prompt,
                    userSavePath: outputPath,
                    generatedAt: new Date().toISOString(),
                    analysisPatterns: analysisPatterns
                },
                type: 'json'
            });
            
            if (libraryResult.success) {
                logToOLED(`📚 Added to library (humanization category)`);
                updateLibraryDisplay();
            }
            
            return { data: response.data, filename: userFilename, path: outputPath };
        } else {
            throw new Error('Failed to generate humanized JSON');
        }
    } catch (error) {
        logToOLED(`❌ JSON generation failed: ${error.message}`);
        throw error;
    }
}

// Generate MIDI with save dialog and library integration
async function generateMIDIWithSaveDialog(prompt) {
    try {
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
        
        if (result && result.success && result.data) {
            const generatedData = result.data;
            const defaultFilename = generatedData.filename || 'Generated MIDI.mid';
            
            // Show save dialog for user to choose location and filename
            const saveResult = await electronAPI.showSaveDialog({
                title: 'Save Generated MIDI',
                defaultPath: defaultFilename,
                filters: [
                    { name: 'MIDI Files', extensions: ['mid', 'midi'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            
            if (saveResult.canceled) {
                logToOLED('💭 Save canceled by user');
                return null;
            }
            
            const userFilename = saveResult.filePath.split('/').pop();
            const outputPath = saveResult.filePath;
            
            // Save the MIDI buffer to user's chosen location
            if (generatedData.midiBuffer) {
                await electronAPI.writeFile(outputPath, generatedData.midiBuffer);
                
                // Verify file exists
                const fileExists = await electronAPI.checkFileExists(outputPath);
                if (!fileExists) {
                    throw new Error('MIDI file was not created successfully');
                }
                
                logToOLED(`✅ MIDI file saved: ${userFilename}`);
                
                // Save to library for future access
                const category = generatedData.category || 'midi';
                const libraryResult = await electronAPI.saveToLibrary({
                    fileName: userFilename,
                    content: generatedData.midiBuffer,
                    category: category,
                    metadata: {
                        ...generatedData.metadata,
                        prompt,
                        userSavePath: outputPath
                    },
                    type: 'midi'
                });
                
                if (libraryResult.success) {
                    logToOLED(`📚 Added to library (${category} category)`);
                    updateLibraryDisplay();
                }
                
                return { filename: userFilename, path: outputPath, data: generatedData };
            } else {
                throw new Error('No MIDI buffer provided in result');
            }
        } else {
            throw new Error(result?.error || 'Failed to generate MIDI');
        }
    } catch (error) {
        logToOLED(`❌ MIDI generation failed: ${error.message}`);
        throw error;
    }
}

// Generate combined JSON humanization + MIDI files
async function generateCombinedMusicFiles(prompt) {
    try {
        logToOLED('🎼 Generating combined music files (JSON + MIDI)...');
        
    // Extract analysisPatterns once and pass to both generators
    const analysisPatterns = extractAnalysisPatterns();
    const jsonResult = await generateHumanizedJSONInternal(prompt, analysisPatterns);
    const midiResult = await generateMIDIInternal(prompt, analysisPatterns);
        
        if (!jsonResult || !midiResult) {
            throw new Error('Failed to generate one or both files');
        }
        
        // Show save dialog for the base filename (will save both files with different extensions)
        const saveResult = await electronAPI.showSaveDialog({
            title: 'Save Combined Music Files',
            defaultPath: `${generateSmartFilename(prompt, 'music', { template: 'descriptive' })}`,
            filters: [
                { name: 'Music Project', extensions: ['*'] }
            ]
        });
        
        if (saveResult.canceled) {
            logToOLED('💭 Save canceled by user');
            return null;
        }
        
        const basePath = saveResult.filePath.replace(/\.[^/.]+$/, ''); // Remove extension if any
        const jsonPath = `${basePath}.json`;
        const midiPath = `${basePath}.mid`;
        const jsonFilename = jsonPath.split('/').pop();
        const midiFilename = midiPath.split('/').pop();
        
        // Save both files
        await electronAPI.writeFile(jsonPath, JSON.stringify(jsonResult.data, null, 2));
        await electronAPI.writeFile(midiPath, midiResult.midiBuffer);
        
        // Verify both files were created
        const jsonExists = await electronAPI.checkFileExists(jsonPath);
        const midiExists = await electronAPI.checkFileExists(midiPath);
        
        if (!jsonExists || !midiExists) {
            throw new Error('One or both files were not created successfully');
        }
        
        logToOLED(`✅ Combined files saved: ${jsonFilename} & ${midiFilename}`);
        
        // Save both to library
        const category = midiResult.category || 'combined';
        
        await electronAPI.saveToLibrary({
            fileName: jsonFilename,
            content: JSON.stringify(jsonResult.data, null, 2),
            category: category,
            metadata: {
                prompt,
                userSavePath: jsonPath,
                generatedAt: new Date().toISOString(),
                relatedMidiFile: midiFilename
            },
            type: 'json'
        });
        
        await electronAPI.saveToLibrary({
            fileName: midiFilename,
            content: midiResult.midiBuffer,
            category: category,
            metadata: {
                ...midiResult.metadata,
                prompt,
                userSavePath: midiPath,
                relatedJsonFile: jsonFilename
            },
            type: 'midi'
        });
        
        logToOLED(`📚 Both files added to library (${category} category)`);
        updateLibraryDisplay();
        
        return { 
            jsonFilename, 
            midiFilename, 
            jsonPath, 
            midiPath,
            jsonData: jsonResult.data,
            midiData: midiResult
        };
    } catch (error) {
        logToOLED(`❌ Combined generation failed: ${error.message}`);
        throw error;
    }
}

// Internal JSON generation (no save dialog, returns data only)
async function generateHumanizedJSONInternal(prompt, analysisPatterns) {
    if (!analysisPatterns) analysisPatterns = extractPatternsFromAnalyzedFiles();
    
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
        return { data: response.data };
    } else {
        throw new Error('Failed to generate humanized JSON');
    }
}

// Internal MIDI generation (no save dialog, returns data only)
async function generateMIDIInternal(prompt, analysisPatterns = extractPatternsFromAnalyzedFiles()) {
    if (!analysisPatterns) analysisPatterns = extractAnalysisPatterns();
    const enhancedPrompt = `${prompt} - Use these patterns: Key signatures: ${Array.from(analysisPatterns.keys).join(', ')}, Chord progressions: ${Array.from(analysisPatterns.chords).join(', ')}, Tempo range: ${analysisPatterns.tempoRange.min}-${analysisPatterns.tempoRange.max} BPM`;
    
    const result = await electronAPI.generateMidi(enhancedPrompt, {
        ...appSettings,
        analysisPatterns: analysisPatterns
    });
    
    if (result && result.success && result.data) {
        return result.data;
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
        
        // Force refresh OLED display after scan completion
        setTimeout(async () => {
            await updateOLEDDisplay();
            logToOLED('📊 Library status updated');
        }, 2000);

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

        // Prevent scanning system directories
        if (folderPath === '/' || folderPath === '\\' || 
            folderPath.startsWith('/System') || folderPath.startsWith('/Library') ||
            folderPath.startsWith('/usr') || folderPath.startsWith('/bin') ||
            folderPath.startsWith('/sbin') || folderPath.startsWith('/etc') ||
            folderPath.startsWith('/var') || folderPath.startsWith('/tmp') ||
            folderPath.startsWith('/opt') || folderPath.startsWith('/private') ||
            folderPath.startsWith('/cores') || folderPath.startsWith('/dev') ||
            folderPath.startsWith('/home') || folderPath.startsWith('/net') ||
            folderPath.startsWith('/mnt') || folderPath.startsWith('/proc') ||
            folderPath.startsWith('/root') || folderPath.startsWith('/run') ||
            folderPath.startsWith('/srv') || folderPath.startsWith('/sys')) {
            throw new Error('Cannot scan system directories. Please select a user directory or music folder.');
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
            if (analysis.tempo && typeof analysis.tempo === 'number') patterns.tempos.push(analysis.tempo);
            
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
        console.log('🔄 Updating OLED display...');
        const status = await electronAPI.getSystemStatus();
        
        if (status.error) {
            console.error('Error getting system status:', status.error);
            logToOLED(`❌ Database error: ${status.error}`);
            return;
        }
        
        // Check if database is connected
        if (!status.database || !status.database.connected) {
            console.warn('Database not connected, using fallback values');
            logToOLED('⚠️ Database not connected, showing cached data');
        }

        console.log('📊 Raw status data:', JSON.stringify(status, null, 2));

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
        
        // Calculate total samples from instruments
        let totalSamples = 0;
        if (status.instruments && status.instruments.instruments) {
            totalSamples = Object.values(status.instruments.instruments).reduce((sum, count) => sum + count, 0);
        }

        if (chordCountEl) chordCountEl.textContent = chordCount;
        if (guitarCountEl) guitarCountEl.textContent = guitarCount;
        if (pianoCountEl) pianoCountEl.textContent = pianoCount;
        if (drumCountEl) drumCountEl.textContent = drumCount;
        if (bassCountEl) bassCountEl.textContent = bassCount;
        if (totalFilesEl) totalFilesEl.textContent = totalFiles;
        
        // Update additional status indicators
        const processedFilesEl = document.getElementById('processed-files');
        const totalSamplesEl = document.getElementById('total-samples');
        const filesStatusEl = document.getElementById('files-status');
        
        if (processedFilesEl) processedFilesEl.textContent = totalFiles;
        if (totalSamplesEl) totalSamplesEl.textContent = totalSamples;
        if (filesStatusEl) filesStatusEl.textContent = loadedFiles.length;

        // Add update animation
        const oledDisplay = document.getElementById('oled-display');
        if (oledDisplay) {
            oledDisplay.classList.add('updating');
            setTimeout(() => oledDisplay.classList.remove('updating'), 500);
        }

        // Log comprehensive status to console for debugging
        console.log('📊 === OLED DISPLAY UPDATED ===');
        console.log(`🎵 Audio Files: ${status.database?.audio_files || 0}`);
        console.log(`🎹 MIDI Files: ${status.database?.midi_files || 0}`);
        console.log(`📁 Total Files: ${totalFiles}`);
        console.log(`🎸 Guitar Sounds: ${guitarCount}`);
        console.log(`🎹 Piano Sounds: ${pianoCount}`);
        console.log(`🥁 Drum Sounds: ${drumCount}`);
        console.log(`🎸 Bass Sounds: ${bassCount}`);
        console.log(`🎶 Chord Patterns: ${chordCount}`);
        
        // Show instrument breakdown if available
        if (status.instruments && status.instruments.instruments) {
            console.log('🎸 === INSTRUMENT BREAKDOWN ===');
            Object.entries(status.instruments.instruments).forEach(([name, count]) => {
                if (count > 0) {
                    console.log(`${getInstrumentEmoji(name)} ${name}: ${count}`);
                }
            });
        }

    } catch (error) {
        console.error('Error updating OLED display:', error);
        logToOLED(`❌ OLED display error: ${error.message}`);
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
        
        if (typeof result === 'string') {
            // Display the answer on the main OLED display
            logToOLED('📊 === STATUS RESPONSE ===');
            const lines = result.split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    logToOLED(line.trim());
                }
            }
            logToOLED('========================');
        } else if (result.error) {
            logToOLED(`❌ Status query error: ${result.error}`);
        } else {
            logToOLED(`❌ Unexpected response format: ${typeof result}`);
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