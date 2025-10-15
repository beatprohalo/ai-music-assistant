// auto-naming-system.js - Intelligent file naming for generated content

class AutoNamingSystem {
    constructor() {
        this.musicalTerms = {
            instruments: ['piano', 'guitar', 'drums', 'bass', 'violin', 'cello', 'flute', 'sax', 'trumpet', 'synth', 'organ'],
            genres: ['rock', 'jazz', 'classical', 'electronic', 'pop', 'blues', 'folk', 'metal', 'ambient', 'house', 'techno'],
            moods: ['happy', 'sad', 'energetic', 'calm', 'dramatic', 'mysterious', 'uplifting', 'melancholy', 'aggressive', 'peaceful'],
            keys: ['c', 'g', 'f', 'd', 'a', 'e', 'b', 'major', 'minor', 'sharp', 'flat'],
            tempo: ['slow', 'fast', 'moderate', 'allegro', 'andante', 'presto', 'adagio', 'ballad'],
            structure: ['verse', 'chorus', 'bridge', 'intro', 'outro', 'solo', 'breakdown']
        };
        
        this.templates = {
            simple: '{prompt}_{timestamp}',
            descriptive: '{genre}_{mood}_{instrument}_{timestamp}',
            analytical: '{key}_{tempo}_{instrument}_{type}_{timestamp}',
            creative: '{adjective}_{noun}_{timestamp}',
            professional: '{genre}_{key}_{tempo}bpm_{timestamp}'
        };
        
        this.creativePairs = {
            adjectives: ['cosmic', 'digital', 'ethereal', 'mystic', 'neon', 'vintage', 'electric', 'dreamy', 'urban', 'melodic'],
            nouns: ['journey', 'echoes', 'waves', 'dreams', 'shadows', 'lights', 'pulse', 'flow', 'storm', 'silence']
        };
    }

    /**
     * Generate an intelligent filename based on prompt and analysis patterns
     * @param {string} prompt - User's input prompt
     * @param {Object} analysisPatterns - Patterns from analyzed music library
     * @param {string} type - File type ('json', 'midi', 'both')
     * @param {Object} options - Additional options
     * @returns {string} Generated filename
     */
    generateFilename(prompt, analysisPatterns = {}, type = 'json', options = {}) {
        const template = options.template || 'descriptive';
        const maxLength = options.maxLength || 50;
        const includeTimestamp = options.includeTimestamp !== false;
        
        try {
            // Extract musical elements from prompt
            const promptAnalysis = this.analyzePrompt(prompt);
            
            // Combine with library patterns
            const combinedData = this.combinePatterns(promptAnalysis, analysisPatterns);
            
            // Generate name components
            const components = this.generateComponents(combinedData, type);
            
            // Apply template
            let filename = this.applyTemplate(template, components);
            
            // Clean and finalize
            filename = this.sanitizeFilename(filename, maxLength);
            
            // Add extension
            const extension = this.getExtension(type);
            
            return `${filename}${extension}`;
            
        } catch (error) {
            console.error('Auto-naming failed, using fallback:', error);
            return this.getFallbackName(type);
        }
    }

    /**
     * Analyze user prompt for musical content
     */
    analyzePrompt(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        const words = lowerPrompt.split(/\s+/);
        
        const found = {
            instruments: [],
            genres: [],
            moods: [],
            keys: [],
            tempo: [],
            structure: [],
            rawWords: words.filter(word => word.length > 2) // Keep meaningful words
        };

        // Check each category
        Object.keys(this.musicalTerms).forEach(category => {
            this.musicalTerms[category].forEach(term => {
                if (lowerPrompt.includes(term)) {
                    found[category].push(term);
                }
            });
        });

        return found;
    }

    /**
     * Combine prompt analysis with library patterns
     */
    combinePatterns(promptAnalysis, analysisPatterns) {
        const combined = { ...promptAnalysis };
        
        // Add most common patterns from library
        if (analysisPatterns.keys && analysisPatterns.keys.size > 0) {
            combined.libraryKeys = Array.from(analysisPatterns.keys).slice(0, 2);
        }
        
        if (analysisPatterns.genres && analysisPatterns.genres.size > 0) {
            combined.libraryGenres = Array.from(analysisPatterns.genres).slice(0, 2);
        }
        
        if (analysisPatterns.instruments && analysisPatterns.instruments.size > 0) {
            combined.libraryInstruments = Array.from(analysisPatterns.instruments).slice(0, 2);
        }
        
        if (analysisPatterns.tempoRange) {
            combined.tempo = this.tempoToDescription(analysisPatterns.tempoRange);
        }
        
        return combined;
    }

    /**
     * Generate naming components
     */
    generateComponents(data, type) {
        const components = {};
        
        // Primary instrument
        components.instrument = this.pickBest(data.instruments) || 
                               this.pickBest(data.libraryInstruments) || 
                               'synth';
        
        // Genre
        components.genre = this.pickBest(data.genres) || 
                          this.pickBest(data.libraryGenres) || 
                          'electronic';
        
        // Mood
        components.mood = this.pickBest(data.moods) || 'ambient';
        
        // Key
        components.key = this.pickBest(data.keys) || 
                        this.pickBest(data.libraryKeys) || 'c';
        
        // Tempo
        components.tempo = this.pickBest(data.tempo) || 'moderate';
        
        // Creative elements
        components.adjective = this.pickRandom(this.creativePairs.adjectives);
        components.noun = this.pickRandom(this.creativePairs.nouns);
        
        // Prompt-based name
        components.prompt = this.extractMainConcept(data.rawWords);
        
        // Type
        components.type = type;
        
        // Timestamp
        components.timestamp = this.generateTimestamp();
        
        return components;
    }

    /**
     * Apply naming template
     */
    applyTemplate(templateName, components) {
        const template = this.templates[templateName] || this.templates.descriptive;
        
        let result = template;
        Object.keys(components).forEach(key => {
            const placeholder = `{${key}}`;
            if (result.includes(placeholder)) {
                result = result.replace(placeholder, components[key] || '');
            }
        });
        
        // Clean up any remaining placeholders
        result = result.replace(/\{[^}]*\}/g, '');
        
        return result;
    }

    /**
     * Helper methods
     */
    pickBest(array) {
        return array && array.length > 0 ? array[0] : null;
    }

    pickRandom(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    extractMainConcept(words) {
        if (!words || words.length === 0) return 'untitled';
        
        // Filter out common words
        const commonWords = ['the', 'and', 'or', 'but', 'with', 'for', 'to', 'in', 'on', 'at'];
        const meaningful = words.filter(word => !commonWords.includes(word) && word.length > 2);
        
        return meaningful.slice(0, 2).join('-') || 'composition';
    }

    tempoToDescription(tempoRange) {
        const avg = (tempoRange.min + tempoRange.max) / 2;
        if (avg < 80) return 'slow';
        if (avg < 120) return 'moderate';
        if (avg < 160) return 'fast';
        return 'rapid';
    }

    sanitizeFilename(filename, maxLength) {
        // Remove invalid characters
        let clean = filename
            .replace(/[^a-zA-Z0-9\-_]/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_|_$/g, '');
        
        // Ensure reasonable length
        if (clean.length > maxLength) {
            clean = clean.substring(0, maxLength);
        }
        
        // Ensure it's not empty
        if (!clean || clean.length < 3) {
            clean = 'generated_music';
        }
        
        return clean;
    }

    getExtension(type) {
        switch (type.toLowerCase()) {
            case 'midi': return '.mid';
            case 'json': return '.json';
            case 'audio': return '.wav';
            default: return '.json';
        }
    }

    generateTimestamp() {
        const now = new Date();
        return now.toISOString()
            .replace(/[-:]/g, '')
            .replace(/\.\d{3}Z/, '')
            .substring(2, 13); // YYMMDDHHmm format
    }

    getFallbackName(type) {
        const timestamp = this.generateTimestamp();
        const extension = this.getExtension(type);
        return `generated_${timestamp}${extension}`;
    }

    /**
     * Get suggested names for user selection
     */
    getSuggestions(prompt, analysisPatterns, type, count = 5) {
        const suggestions = [];
        const templates = Object.keys(this.templates);
        
        for (let i = 0; i < count && i < templates.length; i++) {
            const template = templates[i];
            const filename = this.generateFilename(prompt, analysisPatterns, type, { 
                template, 
                includeTimestamp: i > 0 // First suggestion without timestamp
            });
            suggestions.push({
                name: filename,
                template: template,
                description: this.getTemplateDescription(template)
            });
        }
        
        return suggestions;
    }

    getTemplateDescription(template) {
        const descriptions = {
            simple: 'Based on your prompt',
            descriptive: 'Genre, mood, and instrument',
            analytical: 'Key, tempo, and technical details',
            creative: 'Artistic and evocative names',
            professional: 'Industry-standard format'
        };
        return descriptions[template] || 'Custom naming style';
    }
}

// Export for use in renderer
if (typeof window !== 'undefined') {
    window.AutoNamingSystem = AutoNamingSystem;
} else if (typeof module !== 'undefined') {
    module.exports = AutoNamingSystem;
}