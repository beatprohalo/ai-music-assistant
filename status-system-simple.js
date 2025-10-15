// Simplified status system for AI Music Assistant (no database)
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;

class StatusSystem {
    constructor(userDataPath) {
        this.userDataPath = userDataPath;
        this.dataPath = path.join(userDataPath, 'HumanizerAI', 'data.json');
        this.modelDirPath = path.join(userDataPath, 'HumanizerAI', 'models');
        this.lanceDbPath = path.join(userDataPath, 'HumanizerAI', 'lancedb');
        this.data = {
            files: [],
            features: [],
            lastUpdated: new Date().toISOString()
        };
    }

    async initialize() {
        try {
            const dataDir = path.dirname(this.dataPath);
            await fsp.mkdir(dataDir, { recursive: true });
            
            // Try to load existing data
            try {
                const dataContent = await fsp.readFile(this.dataPath, 'utf8');
                this.data = JSON.parse(dataContent);
                console.log(`📁 Loaded existing data with ${this.data.files?.length || 0} files`);
                console.log(`📊 Data file path: ${this.dataPath}`);
                console.log(`📅 Last updated: ${this.data.lastUpdated}`);
            } catch (error) {
                // File doesn't exist or is invalid, start fresh
                console.log('Starting with fresh data');
                console.log(`📁 Data file path: ${this.dataPath}`);
                this.data = {
                    files: [],
                    features: [],
                    lastUpdated: new Date().toISOString()
                };
            }
            
            // Ensure data structure is valid
            if (!this.data.files) {
                this.data.files = [];
            }
            if (!this.data.features) {
                this.data.features = [];
            }
            if (!this.data.lastUpdated) {
                this.data.lastUpdated = new Date().toISOString();
            }
            
            console.log('Status system initialized (simple mode)');
            return true;
        } catch (error) {
            console.error('Error initializing status system:', error);
            // Initialize with default data even if there's an error
            this.data = {
                files: [],
                features: [],
                lastUpdated: new Date().toISOString()
            };
            return false;
        }
    }

    async saveData() {
        try {
            this.data.lastUpdated = new Date().toISOString();
            console.log(`💾 Saving data to: ${this.dataPath}`);
            console.log(`📊 Data contains ${this.data.files?.length || 0} files`);
            await fsp.writeFile(this.dataPath, JSON.stringify(this.data, null, 2), 'utf8');
            console.log('✅ Data saved successfully');
            return true;
        } catch (error) {
            console.error('❌ Error saving data:', error);
            return false;
        }
    }

    async getSystemStatus() {
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
            // Ensure data structure exists
            if (!this.data || !this.data.files) {
                console.warn('Data structure not initialized, returning empty status');
                return {
                    connected: false,
                    total_files: 0,
                    audio_files: 0,
                    midi_files: 0,
                    humanization_files: 0,
                    pattern_files: 0,
                    total_size_mb: 0,
                    last_updated: new Date().toISOString(),
                    error: 'Data not initialized'
                };
            }
            
            return {
                connected: true,
                total_files: this.data.files.length,
                audio_files: this.data.files.filter(f => f.fileType === 'audio').length,
                midi_files: this.data.files.filter(f => f.fileType === 'midi').length,
                humanization_files: this.data.files.filter(f => f.category === 'humanization').length,
                pattern_files: this.data.files.filter(f => f.category === 'pattern').length,
                total_size_mb: Math.round(this.data.files.reduce((sum, f) => sum + (f.fileSize || 0), 0) / 1024 / 1024),
                last_updated: this.data.lastUpdated
            };
        } catch (error) {
            console.error('Error getting database status:', error);
            return {
                connected: false,
                total_files: 0,
                audio_files: 0,
                midi_files: 0,
                humanization_files: 0,
                pattern_files: 0,
                total_size_mb: 0,
                last_updated: new Date().toISOString(),
                error: error.message
            };
        }
    }

    async getModelStatus() {
        try {
            const modelFiles = await this.getModelFiles();
            return {
                available: modelFiles.length > 0,
                count: modelFiles.length,
                models: modelFiles.map(f => ({
                    name: f.name,
                    size: f.size,
                    modified: f.modified
                }))
            };
        } catch (error) {
            return { available: false, error: error.message };
        }
    }

    async getFileStatus() {
        const files = this.data.files;
        return {
            total: files.length,
            audio: files.filter(f => f.fileType === 'audio').length,
            midi: files.filter(f => f.fileType === 'midi').length,
            by_category: {
                humanization: files.filter(f => f.category === 'humanization').length,
                pattern: files.filter(f => f.category === 'pattern').length,
                other: files.filter(f => !f.category || (f.category !== 'humanization' && f.category !== 'pattern')).length
            }
        };
    }

    async getInstrumentStatus() {
        const files = this.data.files;
        const instruments = {};
        
        files.forEach(file => {
            if (file.analysisData && file.analysisData.instruments) {
                file.analysisData.instruments.forEach(instrument => {
                    instruments[instrument] = (instruments[instrument] || 0) + 1;
                });
            }
        });

        return {
            total_instruments: Object.keys(instruments).length,
            instruments: instruments,
            chord_count: files.filter(f => f.category === 'chord').length,
            guitar_count: files.filter(f => f.analysisData?.instruments?.includes('guitar')).length,
            piano_count: files.filter(f => f.analysisData?.instruments?.includes('piano')).length,
            drum_count: files.filter(f => f.analysisData?.instruments?.includes('drum')).length,
            bass_count: files.filter(f => f.analysisData?.instruments?.includes('bass')).length
        };
    }

    async getCategoryStatus() {
        const files = this.data.files;
        const categories = {};
        
        files.forEach(file => {
            const category = file.category || 'uncategorized';
            categories[category] = (categories[category] || 0) + 1;
        });

        return {
            total_categories: Object.keys(categories).length,
            categories: categories
        };
    }

    async getPerformanceStatus() {
        return {
            memory_usage: process.memoryUsage(),
            uptime: process.uptime(),
            platform: process.platform,
            node_version: process.version
        };
    }

    async addFile(fileData) {
        try {
            console.log(`📁 Adding file to database: ${fileData.fileName}`);
            const file = {
                id: Date.now().toString(),
                filePath: fileData.filePath,
                fileName: fileData.fileName,
                fileType: fileData.fileType,
                fileSize: fileData.fileSize,
                category: fileData.category || 'uncategorized',
                analysisData: fileData.analysisData || {},
                createdAt: new Date().toISOString()
            };
            
            this.data.files.push(file);
            console.log(`✅ File added to memory. Total files: ${this.data.files.length}`);
            
            const saveResult = await this.saveData();
            if (saveResult) {
                console.log(`💾 File data saved to disk: ${fileData.fileName}`);
            } else {
                console.error(`❌ Failed to save file data: ${fileData.fileName}`);
            }
            
            return { success: true, fileId: file.id };
        } catch (error) {
            console.error('Error adding file:', error);
            return { success: false, error: error.message };
        }
    }

    async getAllFiles() {
        try {
            if (!this.data || !this.data.files) {
                console.warn('Data not initialized, returning empty array');
                return [];
            }
            return this.data.files;
        } catch (error) {
            console.error('Error getting all files:', error);
            return [];
        }
    }

    async purgeDatabase() {
        try {
            this.data.files = [];
            this.data.features = [];
            this.data.lastUpdated = new Date().toISOString();
            await this.saveData();
            return { success: true };
        } catch (error) {
            console.error('Error purging database:', error);
            return { success: false, error: error.message };
        }
    }

    async ask(question) {
        // Simple Q&A based on available data
        const files = this.data.files;
        const totalFiles = files.length;
        const audioFiles = files.filter(f => f.fileType === 'audio').length;
        const midiFiles = files.filter(f => f.fileType === 'midi').length;
        
        if (question.toLowerCase().includes('how many') || question.toLowerCase().includes('count')) {
            if (question.toLowerCase().includes('audio')) {
                return `I have ${audioFiles} audio files in my library.`;
            } else if (question.toLowerCase().includes('midi')) {
                return `I have ${midiFiles} MIDI files in my library.`;
            } else {
                return `I have ${totalFiles} total files in my library (${audioFiles} audio, ${midiFiles} MIDI).`;
            }
        } else if (question.toLowerCase().includes('what') && question.toLowerCase().includes('capabilities')) {
            return `I can analyze audio and MIDI files, extract musical features, generate chord progressions, and help with music composition. I currently have ${totalFiles} files in my library.`;
        } else {
            return `I'm an AI Music Assistant with ${totalFiles} files in my library. I can help with music analysis, generation, and composition. How can I assist you?`;
        }
    }

    async getModelFiles() {
        try {
            if (!fs.existsSync(this.modelDirPath)) {
                return [];
            }
            
            const files = await fsp.readdir(this.modelDirPath);
            const modelFiles = [];
            
            for (const file of files) {
                const filePath = path.join(this.modelDirPath, file);
                const stats = await fsp.stat(filePath);
                modelFiles.push({
                    name: file,
                    size: stats.size,
                    modified: stats.mtime.toISOString()
                });
            }
            
            return modelFiles;
        } catch (error) {
            console.error('Error getting model files:', error);
            return [];
        }
    }

    async clearDatabase() {
        try {
            // Clear all data
            this.data = {
                files: [],
                features: [],
                lastUpdated: new Date().toISOString()
            };
            
            // Save empty data to file
            await this.saveData();
            console.log('📗 Database cleared successfully');
            return { success: true };
        } catch (error) {
            console.error('Error clearing database:', error);
            throw error;
        }
    }

    async reindexFiles() {
        try {
            // For now, just update the lastUpdated timestamp
            // In a full implementation, this would scan and re-analyze all files
            this.data.lastUpdated = new Date().toISOString();
            
            // Update file indices and features
            this.data.files.forEach((file, index) => {
                file.id = file.id || index + 1;
                file.dateAdded = file.dateAdded || new Date().toISOString();
            });
            
            await this.saveData();
            console.log('📗 Library reindexed successfully');
            return { success: true };
        } catch (error) {
            console.error('Error reindexing files:', error);
            throw error;
        }
    }
}

module.exports = StatusSystem;
