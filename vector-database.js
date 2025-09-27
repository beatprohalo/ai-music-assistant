// vector-database.js
// const lancedb = require('lancedb'); // Temporarily disabled
const path = require('path');
const fs = require('fs');

const userDataPath = process.argv.find(arg => arg.startsWith('--user-data-path=')).split('=')[1];
const dbPath = path.join(userDataPath, 'HumanizerAI', 'lancedb');

let db = null;
let humanizationTable = null;
let patternTable = null;

const HUMANIZATION_DIMENSIONS = 6;
const PATTERN_DIMENSIONS = 10;

async function initVectorDatabase() {
    try {
        if (!fs.existsSync(dbPath)) {
            fs.mkdirSync(dbPath, { recursive: true });
        }
        
        // Initialize simple JSON file storage
        const humanizationFile = path.join(dbPath, 'humanization_features.json');
        const patternFile = path.join(dbPath, 'pattern_features.json');
        
        if (!fs.existsSync(humanizationFile)) {
            fs.writeFileSync(humanizationFile, JSON.stringify([]));
        }
        if (!fs.existsSync(patternFile)) {
            fs.writeFileSync(patternFile, JSON.stringify([]));
        }
        
        console.log(`Vector database initialized at: ${dbPath}`);
        return { humanizationTable: 'file', patternTable: 'file' };
    } catch (error) {
        console.error('Error initializing vector database:', error);
        return null;
    }
}

async function addFeaturesToDB(fileData) {
    try {
        const humanizationFile = path.join(dbPath, 'humanization_features.json');
        const patternFile = path.join(dbPath, 'pattern_features.json');
        
        if (fileData.humanizationFeatures && fileData.tags.includes('humanize')) {
            const humanizationData = JSON.parse(fs.readFileSync(humanizationFile, 'utf8'));
            humanizationData.push({
                id: fileData.path + '_humanize',
                sourceFile: fileData.path,
                type: fileData.type,
                tags: fileData.tags,
                featureVector: fileData.humanizationFeatures.featureVector,
                timestamp: new Date().toISOString()
            });
            fs.writeFileSync(humanizationFile, JSON.stringify(humanizationData, null, 2));
        }
        
        if (fileData.patternFeatures && fileData.tags.includes('pattern')) {
            const patternData = JSON.parse(fs.readFileSync(patternFile, 'utf8'));
            patternData.push({
                id: fileData.path + '_pattern',
                sourceFile: fileData.path,
                type: fileData.type,
                tags: fileData.tags,
                featureVector: fileData.patternFeatures.featureVector,
                timestamp: new Date().toISOString()
            });
            fs.writeFileSync(patternFile, JSON.stringify(patternData, null, 2));
        }
        
        console.log(`Added features for ${fileData.name} to vector DB.`);
    } catch (error) {
        console.error('Error adding features to database:', error);
    }
}

async function queryHumanizationFeatures(queryVector, limit = 5) {
    if (!humanizationTable) {
        console.error('Humanization table not initialized.');
        return [];
    }
    
    if (queryVector.length !== HUMANIZATION_DIMENSIONS) {
        console.error(`Query vector dimensions mismatch. Expected ${HUMANIZATION_DIMENSIONS}, got ${queryVector.length}`);
        return [];
    }
    
    try {
        const humanizationFile = path.join(dbPath, 'humanization_features.json');
        if (!fs.existsSync(humanizationFile)) {
            return [];
        }
        
        const data = JSON.parse(fs.readFileSync(humanizationFile, 'utf8'));
        // Simple similarity search (in a real app, you'd use proper vector similarity)
        const results = data.slice(0, limit);
        console.log('Humanization query results:', results.length);
        return results;
    } catch (error) {
        console.error('Error querying humanization features:', error);
        return [];
    }
}

async function queryPatternFeatures(queryVector, limit = 5) {
    try {
        const patternFile = path.join(dbPath, 'pattern_features.json');
        if (!fs.existsSync(patternFile)) {
            return [];
        }
        
        const data = JSON.parse(fs.readFileSync(patternFile, 'utf8'));
        // Simple similarity search (in a real app, you'd use proper vector similarity)
        const results = data.slice(0, limit);
        console.log('Pattern query results:', results.length);
        return results;
    } catch (error) {
        console.error('Error querying pattern features:', error);
        return [];
    }
}

async function clearVectorDatabase() {
    try {
        if (fs.existsSync(dbPath)) {
            fs.rmSync(dbPath, { recursive: true, force: true });
            console.log('Cleared vector database directory.');
        }
        
        await initVectorDatabase();
        return true;
    } catch (error) {
        console.error('Error clearing vector database:', error);
        return false;
    }
}

module.exports = {
    initVectorDatabase,
    addFeaturesToDB,
    queryHumanizationFeatures,
    queryPatternFeatures,
    clearVectorDatabase
};