// status-system.js
 // Comprehensive status system for AI Music Assistant
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
// Ensure we import the fs promises API in a way compatible across Node versions
const fsp = (require('fs').promises) || require('fs/promises');

class StatusSystem {
    constructor(userDataPath) {
        this.userDataPath = userDataPath;
        this.dbPath = path.join(userDataPath, 'HumanizerAI', 'library.db');
        this.modelDirPath = path.join(userDataPath, 'HumanizerAI', 'models');
        this.lanceDbPath = path.join(userDataPath, 'HumanizerAI', 'lancedb');
        this.db = null;
    }


    async initialize() {
        return new Promise(async (resolve, reject) => {
            try {
                const dbDir = path.dirname(this.dbPath);
                await fsp.mkdir(dbDir, { recursive: true });

                this.db = new sqlite3.Database(this.dbPath, (err) => {
                    if (err) {
                        console.error('Error connecting to SQLite database', err);
                        return reject(err);
                    }
                    console.log('Connected to SQLite database');
                    this.db.serialize(() => {
                        const createFilesTable = `
                            CREATE TABLE IF NOT EXISTS files (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                filePath TEXT UNIQUE,
                                fileName TEXT,
                                fileType TEXT,
                                fileSize INTEGER,
                                category TEXT,
                                analysisData TEXT,
                                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                            )
                        `;
                        const createFeaturesTable = `
                            CREATE TABLE IF NOT EXISTS features (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                fileId INTEGER,
                                featureType TEXT,
                                featureData TEXT,
                                FOREIGN KEY (fileId) REFERENCES files (id)
                            )
                        `;

                        this.db.run(createFilesTable, (err) => {
                            if (err) {
                                console.error('Error creating files table', err);
                                return reject(err);
                            }
                            this.db.run(createFeaturesTable, (err) => {
                                if (err) {
                                    console.error('Error creating features table', err);
                                    return reject(err);
                                }
                                console.log('Status system initialized');
                                resolve();
                            });
                        });
                    });
                });
            } catch (error) {
                console.error('Error initializing status system:', error);
                reject(error);
            }
        });
    }

    async getSystemStatus() {
        console.log('🔍 Querying database for status...');
        try {
            const status = {
                timestamp: new Date().toISOString(),
                database: await this.getDatabaseStatus(),
                models: await this.getModelStatus(),
                files: await this.getFileStatus(),
                instruments: await this.getInstrumentStatus(),
                categories: await this.getCategoryStatus(),
                performance: await this.getPerformanceStatus()
            };
            return status;
        } catch (error) {
            console.error('Error getting system status:', error);
            return { error: error.message };
        }
    }

    async getDatabaseStatus() {
        try {
            console.log('🔍 Querying database for status...');
            const stats = await this.queryDatabase(`
                SELECT 
                    COUNT(*) as total_files,
                    SUM(CASE WHEN fileType = 'audio' THEN 1 ELSE 0 END) as audio_files,
                    SUM(CASE WHEN fileType = 'midi' THEN 1 ELSE 0 END) as midi_files,
                    SUM(CASE WHEN category = 'humanization' THEN 1 ELSE 0 END) as humanization_files,
                    SUM(CASE WHEN category = 'pattern' THEN 1 ELSE 0 END) as pattern_files,
                    SUM(fileSize) as total_size_bytes
                FROM files
            `);
            
            console.log('📊 Database stats:', stats);

            const features = await this.queryDatabase(`
                SELECT 
                    featureType,
                    COUNT(*) as count
                FROM features
                GROUP BY featureType
            `);

            return {
                connected: true,
                total_files: stats[0]?.total_files || 0,
                audio_files: stats[0]?.audio_files || 0,
                midi_files: stats[0]?.midi_files || 0,
                humanization_files: stats[0]?.humanization_files || 0,
                pattern_files: stats[0]?.pattern_files || 0,
                total_size_mb: Math.round((stats[0]?.total_size_bytes || 0) / 1024 / 1024),
                features: features.reduce((acc, row) => {
                    acc[row.featureType] = row.count;
                    return acc;
                }, {})
            };
        } catch (error) {
            return { connected: false, error: error.message };
        }
    }

    async getModelStatus() {
        try {
            const modelFiles = await this.getModelFiles();
            const basicPitchStatus = await this.checkModelStatus('basic-pitch');
            const humanizerStatus = await this.checkModelStatus('humanizer');
            
            return {
                basic_pitch: basicPitchStatus,
                humanizer: humanizerStatus,
                total_models: modelFiles.length,
                model_files: modelFiles,
                model_directory: this.modelDirPath,
                lance_db_directory: this.lanceDbPath
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async getFileStatus() {
        try {
            const recentFiles = await this.queryDatabase(`
                SELECT fileName, fileType, category, createdAt, fileSize
                FROM files
                ORDER BY createdAt DESC
                LIMIT 10
            `);

            const fileTypes = await this.queryDatabase(`
                SELECT fileType, COUNT(*) as count
                FROM files
                GROUP BY fileType
            `);

            const categories = await this.queryDatabase(`
                SELECT category, COUNT(*) as count
                FROM files
                GROUP BY category
            `);

            return {
                recent_files: recentFiles,
                file_types: fileTypes.reduce((acc, row) => {
                    acc[row.fileType] = row.count;
                    return acc;
                }, {}),
                categories: categories.reduce((acc, row) => {
                    acc[row.category] = row.count;
                    return acc;
                }, {})
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async getInstrumentStatus() {
        try {
            console.log('🎵 Getting instrument status...');
            // Get instrument data from analysis
            const instrumentData = await this.queryDatabase(`
                SELECT analysisData, fileType, category
                FROM files
                WHERE analysisData IS NOT NULL
            `);
            
            console.log(`📊 Found ${instrumentData.length} files with analysis data`);

            const instruments = {
                guitar: 0,
                piano: 0,
                drums: 0,
                bass: 0,
                lead: 0,
                chords: 0,
                kick: 0,
                snare: 0,
                hihat: 0,
                strings: 0,
                brass: 0,
                percussion: 0,
                synth: 0,
                vocals: 0,
                // Additional categories
                acoustic_guitar: 0,
                electric_guitar: 0,
                acoustic_piano: 0,
                electric_piano: 0,
                drum_kit: 0,
                bass_guitar: 0,
                bass_synth: 0,
                lead_synth: 0,
                pad_synth: 0,
                arp_synth: 0,
                violin: 0,
                cello: 0,
                viola: 0,
                trumpet: 0,
                saxophone: 0,
                trombone: 0,
                flute: 0,
                clarinet: 0,
                organ: 0,
                harpsichord: 0
            };

            // Parse analysis data to count instruments
            for (const row of instrumentData) {
                try {
                    const analysis = JSON.parse(row.analysisData);
                    
                    // Count from instruments field
                    if (analysis.instruments) {
                        const instList = Array.isArray(analysis.instruments) ? analysis.instruments : [analysis.instruments];
                        for (const instrument of instList) {
                            this.categorizeInstrument(instrument, instruments);
                        }
                    }
                    
                    // Count from chord progressions
                    if (analysis.chords || analysis.chordProgressions) {
                        const chords = analysis.chords || analysis.chordProgressions;
                        if (Array.isArray(chords)) {
                            instruments.chords += chords.length;
                        } else {
                            instruments.chords++;
                        }
                    }
                    
                    // Count from patterns
                    if (analysis.patterns) {
                        if (Array.isArray(analysis.patterns)) {
                            instruments.lead += analysis.patterns.length;
                        } else {
                            instruments.lead++;
                        }
                    }
                    
                    // Count from melodic patterns
                    if (analysis.melodicPatterns) {
                        if (Array.isArray(analysis.melodicPatterns)) {
                            instruments.lead += analysis.melodicPatterns.length;
                        } else {
                            instruments.lead++;
                        }
                    }
                    
                    // Count from rhythmic patterns
                    if (analysis.rhythmicPatterns) {
                        if (Array.isArray(analysis.rhythmicPatterns)) {
                            instruments.drums += analysis.rhythmicPatterns.length;
                        } else {
                            instruments.drums++;
                        }
                    }
                    
                } catch (parseError) {
                    // Skip invalid JSON
                }
            }

            console.log('🎵 Final instrument counts:', instruments);
            return instruments;
        } catch (error) {
            console.error('❌ Error getting instrument status:', error);
            return { error: error.message };
        }
    }

    categorizeInstrument(instrument, instruments) {
        const instLower = instrument.toLowerCase();
        
        // Guitar categories
        if (instLower.includes('guitar')) {
            instruments.guitar++;
            if (instLower.includes('acoustic')) {
                instruments.acoustic_guitar++;
            } else if (instLower.includes('electric')) {
                instruments.electric_guitar++;
            }
        }
        
        // Piano categories
        if (instLower.includes('piano') || instLower.includes('keyboard')) {
            instruments.piano++;
            if (instLower.includes('acoustic')) {
                instruments.acoustic_piano++;
            } else if (instLower.includes('electric') || instLower.includes('digital')) {
                instruments.electric_piano++;
            }
        }
        
        // Drum categories
        if (instLower.includes('drum') || instLower.includes('percussion')) {
            instruments.drums++;
            if (instLower.includes('kit') || instLower.includes('set')) {
                instruments.drum_kit++;
            }
            if (instLower.includes('kick') || instLower.includes('bass drum')) {
                instruments.kick++;
            }
            if (instLower.includes('snare')) {
                instruments.snare++;
            }
            if (instLower.includes('hihat') || instLower.includes('hi-hat') || instLower.includes('hi hat')) {
                instruments.hihat++;
            }
        }
        
        // Bass categories
        if (instLower.includes('bass')) {
            instruments.bass++;
            if (instLower.includes('guitar')) {
                instruments.bass_guitar++;
            } else if (instLower.includes('synth') || instLower.includes('synthesizer')) {
                instruments.bass_synth++;
            }
        }
        
        // Lead categories
        if (instLower.includes('lead') || instLower.includes('melody')) {
            instruments.lead++;
            if (instLower.includes('synth') || instLower.includes('synthesizer')) {
                instruments.lead_synth++;
            }
        }
        
        // Synth categories
        if (instLower.includes('synth') || instLower.includes('synthesizer') || instLower.includes('electronic')) {
            instruments.synth++;
            if (instLower.includes('pad')) {
                instruments.pad_synth++;
            }
            if (instLower.includes('arp') || instLower.includes('arpeggiator')) {
                instruments.arp_synth++;
            }
        }
        
        // String instruments
        if (instLower.includes('string') || instLower.includes('violin')) {
            instruments.strings++;
            instruments.violin++;
        }
        if (instLower.includes('cello')) {
            instruments.strings++;
            instruments.cello++;
        }
        if (instLower.includes('viola')) {
            instruments.strings++;
            instruments.viola++;
        }
        
        // Brass instruments
        if (instLower.includes('brass') || instLower.includes('trumpet')) {
            instruments.brass++;
            instruments.trumpet++;
        }
        if (instLower.includes('sax') || instLower.includes('saxophone')) {
            instruments.brass++;
            instruments.saxophone++;
        }
        if (instLower.includes('trombone')) {
            instruments.brass++;
            instruments.trombone++;
        }
        
        // Woodwind instruments
        if (instLower.includes('flute')) {
            instruments.flute++;
        }
        if (instLower.includes('clarinet')) {
            instruments.clarinet++;
        }
        
        // Keyboard instruments
        if (instLower.includes('organ')) {
            instruments.organ++;
        }
        if (instLower.includes('harpsichord')) {
            instruments.harpsichord++;
        }
        
        // Vocal categories
        if (instLower.includes('vocal') || instLower.includes('voice') || instLower.includes('singer')) {
            instruments.vocals++;
        }
    }

    async getCategoryStatus() {
        try {
            const categories = await this.queryDatabase(`
                SELECT 
                    category,
                    COUNT(*) as count,
                    AVG(fileSize) as avg_size
                FROM files
                GROUP BY category
            `);

            const tags = await this.queryDatabase(`
                SELECT tags
                FROM files
                WHERE tags IS NOT NULL
            `);

            const tagCounts = {};
            for (const row of tags) {
                try {
                    const tagList = JSON.parse(row.tags);
                    for (const tag of tagList) {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                    }
                } catch (parseError) {
                    // Skip invalid JSON
                }
            }

            return {
                categories: categories.reduce((acc, row) => {
                    acc[row.category] = {
                        count: row.count,
                        avg_size_mb: Math.round(row.avg_size / 1024 / 1024)
                    };
                    return acc;
                }, {}),
                tags: tagCounts
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async getPerformanceStatus() {
        try {
            const dbSize = await this.getDatabaseSize();
            const modelSize = await this.getModelDirectorySize();
            const lanceDbSize = await this.getLanceDbSize();
            
            return {
                database_size_mb: dbSize,
                models_size_mb: modelSize,
                lance_db_size_mb: lanceDbSize,
                total_size_mb: dbSize + modelSize + lanceDbSize,
                uptime: process.uptime(),
                memory_usage: process.memoryUsage()
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async answerQuestion(question) {
        try {
            const status = await this.getSystemStatus();
            const lowerQuestion = question.toLowerCase();

            // Handle specific questions
            if (lowerQuestion.includes('how many') && lowerQuestion.includes('guitar')) {
                const total = status.instruments.guitar;
                const acoustic = status.instruments.acoustic_guitar;
                const electric = status.instruments.electric_guitar;
                return `I have ${total} guitar sounds in my library (${acoustic} acoustic, ${electric} electric).`;
            }
            
            if (lowerQuestion.includes('how many') && lowerQuestion.includes('piano')) {
                const total = status.instruments.piano;
                const acoustic = status.instruments.acoustic_piano;
                const electric = status.instruments.electric_piano;
                return `I have ${total} piano sounds in my library (${acoustic} acoustic, ${electric} electric).`;
            }
            
            if (lowerQuestion.includes('how many') && lowerQuestion.includes('drum')) {
                const total = status.instruments.drums;
                const kick = status.instruments.kick;
                const snare = status.instruments.snare;
                const hihat = status.instruments.hihat;
                return `I have ${total} drum sounds in my library (${kick} kick drums, ${snare} snares, ${hihat} hi-hats).`;
            }
            
            if (lowerQuestion.includes('how many') && lowerQuestion.includes('bass')) {
                const total = status.instruments.bass;
                const guitar = status.instruments.bass_guitar;
                const synth = status.instruments.bass_synth;
                return `I have ${total} bass sounds in my library (${guitar} bass guitars, ${synth} bass synths).`;
            }
            
            if (lowerQuestion.includes('how many') && lowerQuestion.includes('kick')) {
                return `I have ${status.instruments.kick} kick drum sounds in my library.`;
            }
            
            if (lowerQuestion.includes('how many') && lowerQuestion.includes('snare')) {
                return `I have ${status.instruments.snare} snare drum sounds in my library.`;
            }
            
            if (lowerQuestion.includes('how many') && lowerQuestion.includes('hi-hat')) {
                return `I have ${status.instruments.hihat} hi-hat sounds in my library.`;
            }
            
            if (lowerQuestion.includes('how many') && lowerQuestion.includes('chord')) {
                return `I have ${status.instruments.chords} chord patterns in my library.`;
            }
            
            if (lowerQuestion.includes('how many') && lowerQuestion.includes('lead')) {
                const total = status.instruments.lead;
                const synth = status.instruments.lead_synth;
                return `I have ${total} lead sounds in my library (${synth} lead synths).`;
            }
            
            if (lowerQuestion.includes('how many') && lowerQuestion.includes('synth')) {
                const total = status.instruments.synth;
                const pad = status.instruments.pad_synth;
                const arp = status.instruments.arp_synth;
                return `I have ${total} synthesizer sounds in my library (${pad} pads, ${arp} arpeggiators).`;
            }
            
            if (lowerQuestion.includes('how many') && lowerQuestion.includes('string')) {
                const total = status.instruments.strings;
                const violin = status.instruments.violin;
                const cello = status.instruments.cello;
                const viola = status.instruments.viola;
                return `I have ${total} string instrument sounds in my library (${violin} violins, ${cello} cellos, ${viola} violas).`;
            }
            
            if (lowerQuestion.includes('how many') && lowerQuestion.includes('brass')) {
                const total = status.instruments.brass;
                const trumpet = status.instruments.trumpet;
                const sax = status.instruments.saxophone;
                const trombone = status.instruments.trombone;
                return `I have ${total} brass instrument sounds in my library (${trumpet} trumpets, ${sax} saxophones, ${trombone} trombones).`;
            }
            
            if (lowerQuestion.includes('how many') && lowerQuestion.includes('vocal')) {
                return `I have ${status.instruments.vocals} vocal sounds in my library.`;
            }
            
            if (lowerQuestion.includes('total files') || lowerQuestion.includes('how many files')) {
                return `I have ${status.database.total_files} total files in my library (${status.database.audio_files} audio, ${status.database.midi_files} MIDI).`;
            }
            
            if (lowerQuestion.includes('status') || lowerQuestion.includes('system status')) {
                return this.formatStatusResponse(status);
            }
            
            if (lowerQuestion.includes('what can you do') || lowerQuestion.includes('capabilities')) {
                return this.getCapabilitiesResponse();
            }
            
            if (lowerQuestion.includes('models') || lowerQuestion.includes('machine learning')) {
                return this.getModelsResponse(status);
            }
            
            // Default response
            return `I can answer questions about my library, instruments, and capabilities. Ask me about my guitar sounds, piano sounds, drums, or any other instruments I have. I currently have ${status.database.total_files} files in my library.`;
            
        } catch (error) {
            return `I'm having trouble accessing my status right now: ${error.message}`;
        }
    }

    formatStatusResponse(status) {
        return `SYSTEM STATUS:
📁 Total Files: ${status.database.total_files}
🎵 Audio Files: ${status.database.audio_files}
🎼 MIDI Files: ${status.database.midi_files}
🤖 Humanization Files: ${status.database.humanization_files}
📊 Pattern Files: ${status.database.pattern_files}
💾 Database Size: ${status.database.total_size_mb} MB
🎸 Guitar Sounds: ${status.instruments.guitar}
🎹 Piano Sounds: ${status.instruments.piano}
🥁 Drum Sounds: ${status.instruments.drums}
🎸 Bass Sounds: ${status.instruments.bass}
🎵 Lead Sounds: ${status.instruments.lead}
🎶 Chord Patterns: ${status.instruments.chords}`;
    }

    getCapabilitiesResponse() {
        return `MY CAPABILITIES:
🎵 Audio Analysis - Extract features from audio files
🎼 MIDI Processing - Analyze patterns and chord progressions
🤖 AI Generation - Create humanized music and patterns
📚 Library Management - Store and search musical content
🔍 Pattern Recognition - Identify musical patterns and styles
🎸 Instrument Detection - Recognize guitars, pianos, drums, etc.
🎶 Chord Analysis - Extract chord progressions from audio
🎵 Humanization - Add human-like variations to music
📊 Vector Search - Find similar musical content
🎼 MIDI Generation - Create new MIDI compositions`;
    }

    getModelsResponse(status) {
        return `MACHINE LEARNING MODELS:
🤖 Basic Pitch Model: ${status.models.basic_pitch.status}
🎵 Humanizer Model: ${status.models.humanizer.status}
📁 Model Directory: ${status.models.model_directory}
🗄️ Vector Database: ${status.models.lance_db_directory}
📊 Total Models: ${status.models.total_models}`;
    }

    async getModelFiles() {
        try {
            const files = await fs.readdir(this.modelDirPath);
            return files;
        } catch (error) {
            return [];
        }
    }

    async checkModelStatus(modelName) {
        try {
            const modelPath = path.join(this.modelDirPath, modelName);
            const exists = await fs.access(modelPath).then(() => true).catch(() => false);
            return {
                name: modelName,
                status: exists ? 'loaded' : 'not found',
                path: modelPath
            };
        } catch (error) {
            return {
                name: modelName,
                status: 'error',
                error: error.message
            };
        }
    }

    async queryDatabase(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getDatabaseSize() {
        try {
            const stats = await fs.stat(this.dbPath);
            return Math.round(stats.size / 1024 / 1024);
        } catch (error) {
            return 0;
        }
    }

    async getModelDirectorySize() {
        try {
            const files = await fs.readdir(this.modelDirPath);
            let totalSize = 0;
            for (const file of files) {
                const filePath = path.join(this.modelDirPath, file);
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
            }
            return Math.round(totalSize / 1024 / 1024);
        } catch (error) {
            return 0;
        }
    }

    async getLanceDbSize() {
        try {
            const files = await fs.readdir(this.lanceDbPath);
            let totalSize = 0;
            for (const file of files) {
                const filePath = path.join(this.lanceDbPath, file);
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
            }
            return Math.round(totalSize / 1024 / 1024);
        } catch (error) {
            return 0;
        }
    }

    async addFile(fileData) {
        try {
            console.log('Adding file to database:', fileData.fileName);
            
            const sql = `
                INSERT OR REPLACE INTO files (filePath, fileName, fileType, fileSize, category, analysisData)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const result = await this.queryDatabase(sql, [
                fileData.path,
                fileData.fileName,
                fileData.type || 'unknown',
                fileData.fileSize || 0,
                fileData.category || 'general',
                JSON.stringify(fileData.analysis || {})
            ]);
            
            // Get the file ID
            const fileIdResult = await this.queryDatabase(
                'SELECT id FROM files WHERE filePath = ?',
                [fileData.path]
            );
            
            const fileId = fileIdResult[0]?.id;
            
            // Add features if available
            if (fileData.analysis && fileData.analysis.features) {
                const featureSql = `
                    INSERT INTO features (fileId, featureType, featureData)
                    VALUES (?, ?, ?)
                `;
                
                await this.queryDatabase(featureSql, [
                    fileId,
                    'audio_features',
                    JSON.stringify(fileData.analysis.features)
                ]);
            }
            
            console.log(`✅ File ${fileData.fileName} added to database with ID ${fileId}`);
            return { success: true, fileId: fileId };
            
        } catch (error) {
            console.error('Error adding file to database:', error);
            return { success: false, error: error.message };
        }
    }

    async getAllFiles() {
        try {
            const files = await this.queryDatabase(`
                SELECT 
                    id,
                    filePath,
                    fileName,
                    fileType,
                    fileSize,
                    category,
                    analysisData,
                    createdAt
                FROM files
                ORDER BY createdAt DESC
            `);
            
            return files.map(file => ({
                id: file.id,
                path: file.filePath,
                name: file.fileName,
                type: file.fileType,
                size: file.fileSize,
                category: file.category,
                analysis: file.analysisData ? JSON.parse(file.analysisData) : {},
                addedAt: file.createdAt
            }));
            
        } catch (error) {
            console.error('Error getting all files:', error);
            return [];
        }
    }

    async purgeDatabase() {
        try {
            console.log('🗑️ Purging database...');
            
            // Clear all tables
            await this.queryDatabase('DELETE FROM features');
            await this.queryDatabase('DELETE FROM files');
            
            console.log('✅ Database purged successfully');
            return { success: true };
            
        } catch (error) {
            console.error('Error purging database:', error);
            return { success: false, error: error.message };
        }
    }

    async close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = StatusSystem;
