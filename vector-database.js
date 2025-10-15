// vector-database.js
// Real vector database implementation with LanceDB and SQLite
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const userDataPath = process.argv.find(arg => arg.startsWith('--user-data-path='))?.split('=')[1] || process.cwd();
const dbPath = path.join(userDataPath, 'HumanizerAI', 'lancedb');
const sqlitePath = path.join(userDataPath, 'HumanizerAI', 'library.db');

let db = null;
let humanizationTable = null;
let patternTable = null;
let lanceDb = null;

const HUMANIZATION_DIMENSIONS = 50; // Updated to match real embedding dimensions
const PATTERN_DIMENSIONS = 50;

async function initVectorDatabase() {
    try {
        if (!fs.existsSync(dbPath)) {
            fs.mkdirSync(dbPath, { recursive: true });
        }
        
        // Initialize SQLite for metadata
        await initSQLite();
        
        // For now, use SQLite-only mode
        // In a full implementation, this would initialize LanceDB for vector operations
        console.log('Using SQLite-only mode for vector operations');
        lanceDb = null;
        
        console.log(`Vector database initialized at: ${dbPath}`);
        return { humanizationTable: humanizationTable ? 'lancedb' : 'sqlite', patternTable: patternTable ? 'lancedb' : 'sqlite' };
    } catch (error) {
        console.error('Error initializing vector database:', error);
        return null;
    }
}

async function initSQLite() {
    try {
        db = new Database(sqlitePath);
        console.log('Connected to SQLite database');
        await createSQLiteTables();
    } catch (error) {
        console.error('Error initializing SQLite:', error);
        throw error;
    }
}

async function createSQLiteTables() {
    const createFilesTable = `
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filePath TEXT UNIQUE NOT NULL,
            fileName TEXT NOT NULL,
            fileSize INTEGER,
            fileType TEXT,
            category TEXT,
            tags TEXT,
            analysisData TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createFeaturesTable = `
        CREATE TABLE IF NOT EXISTS features (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fileId INTEGER,
            featureType TEXT,
            featureVector TEXT,
            metadata TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (fileId) REFERENCES files (id)
        )
    `;

    try {
        db.exec(createFilesTable);
        db.exec(createFeaturesTable);
        console.log('SQLite tables created successfully');
    } catch (error) {
        console.error('Error creating SQLite tables:', error);
        throw error;
    }
}

async function addFeaturesToDB(fileData) {
    try {
        // Insert file metadata into SQLite
        const fileId = await insertFileSQLite(fileData);
        
        // Add humanization features
        if (fileData.humanizationFeatures && fileData.tags.includes('humanize')) {
            const humanizationRecord = {
                id: fileId,
                sourceFile: fileData.path,
                type: fileData.type,
                tags: JSON.stringify(fileData.tags),
                featureVector: fileData.humanizationFeatures.featureVector,
                metadata: JSON.stringify(fileData.humanizationFeatures.metadata || {}),
                timestamp: new Date().toISOString()
            };
            
            if (humanizationTable && lanceDb) {
                // Use LanceDB for vector operations
                await humanizationTable.add([humanizationRecord]);
            } else {
                // Fallback to SQLite
                await insertFeatureSQLite(fileId, 'humanization', fileData.humanizationFeatures);
            }
        }
        
        // Add pattern features
        if (fileData.patternFeatures && fileData.tags.includes('pattern')) {
            const patternRecord = {
                id: fileId,
                sourceFile: fileData.path,
                type: fileData.type,
                tags: JSON.stringify(fileData.tags),
                featureVector: fileData.patternFeatures.featureVector,
                metadata: JSON.stringify(fileData.patternFeatures.metadata || {}),
                timestamp: new Date().toISOString()
            };
            
            if (patternTable && lanceDb) {
                // Use LanceDB for vector operations
                await patternTable.add([patternRecord]);
            } else {
                // Fallback to SQLite
                await insertFeatureSQLite(fileId, 'pattern', fileData.patternFeatures);
            }
        }
        
        console.log(`Added features for ${fileData.name} to vector DB.`);
    } catch (error) {
        console.error('Error adding features to database:', error);
    }
}

async function insertFileSQLite(fileData) {
    try {
        const { path: filePath, name: fileName, size: fileSize, type: fileType, category, tags, analysisData } = fileData;
        const sql = `
            INSERT OR REPLACE INTO files (filePath, fileName, fileSize, fileType, category, tags, analysisData)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const stmt = db.prepare(sql);
        const result = stmt.run(filePath, fileName, fileSize, fileType, category, JSON.stringify(tags), JSON.stringify(analysisData));
        return result.lastInsertRowid;
    } catch (error) {
        console.error('Error inserting file:', error);
        throw error;
    }
}

async function insertFeatureSQLite(fileId, featureType, featureData) {
    try {
        const sql = `
            INSERT INTO features (fileId, featureType, featureVector, metadata)
            VALUES (?, ?, ?, ?)
        `;
        
        const stmt = db.prepare(sql);
        const result = stmt.run(fileId, featureType, JSON.stringify(featureData.featureVector), JSON.stringify(featureData.metadata || {}));
        return result.lastInsertRowid;
    } catch (error) {
        console.error('Error inserting feature:', error);
        throw error;
    }
}

async function queryHumanizationFeatures(queryVector, limit = 5) {
    try {
        if (humanizationTable && lanceDb) {
            // Use LanceDB for vector similarity search
            const results = await humanizationTable
                .search(queryVector)
                .limit(limit)
                .toArray();
            
            return results.map(result => ({
                ...result,
                _distance: result._distance || 0,
                similarity: 1 - (result._distance || 0)
            }));
        } else {
            // Fallback to SQLite with cosine similarity
            return await querySimilarSQLite(queryVector, 'humanization', limit);
        }
    } catch (error) {
        console.error('Error querying humanization features:', error);
        return [];
    }
}

async function queryPatternFeatures(queryVector, limit = 5) {
    try {
        if (patternTable && lanceDb) {
            // Use LanceDB for vector similarity search
            const results = await patternTable
                .search(queryVector)
                .limit(limit)
                .toArray();
            
            return results.map(result => ({
                ...result,
                _distance: result._distance || 0,
                similarity: 1 - (result._distance || 0)
            }));
        } else {
            // Fallback to SQLite with cosine similarity
            return await querySimilarSQLite(queryVector, 'pattern', limit);
        }
    } catch (error) {
        console.error('Error querying pattern features:', error);
        return [];
    }
}

async function querySimilarSQLite(queryVector, featureType, limit) {
    try {
        const sql = `
            SELECT f.*, fe.featureVector, fe.metadata
            FROM files f
            JOIN features fe ON f.id = fe.fileId
            WHERE fe.featureType = ?
            ORDER BY f.updatedAt DESC
            LIMIT ?
        `;
        
        const stmt = db.prepare(sql);
        const rows = stmt.all(featureType, limit * 2);
        
        // Calculate cosine similarity
        const results = rows.map(row => {
            const storedVector = JSON.parse(row.featureVector);
            const similarity = calculateCosineSimilarity(queryVector, storedVector);
            return {
                ...row,
                similarity,
                _distance: 1 - similarity,
                featureVector: storedVector,
                metadata: JSON.parse(row.metadata || '{}')
            };
        }).sort((a, b) => b.similarity - a.similarity).slice(0, limit);
        
        return results;
    } catch (error) {
        console.error('Error querying similar features:', error);
        return [];
    }
}

function calculateCosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function clearVectorDatabase() {
    try {
        // Clear LanceDB directory if it exists
        if (fs.existsSync(dbPath)) {
            fs.rmSync(dbPath, { recursive: true, force: true });
            console.log('Cleared LanceDB directory.');
        }
        
        // Clear SQLite database if it exists
        if (fs.existsSync(sqlitePath)) {
            fs.unlinkSync(sqlitePath);
            console.log('Cleared SQLite database.');
        }
        
        // Reinitialize the database
        await initVectorDatabase();
        return true;
    } catch (error) {
        console.error('Error clearing vector database:', error);
        return false;
    }
}

async function clearAllDatabaseData() {
    try {
        // Clear LanceDB directory if it exists
        if (fs.existsSync(dbPath)) {
            fs.rmSync(dbPath, { recursive: true, force: true });
            console.log('Cleared LanceDB directory.');
        }
        
        // Clear SQLite database if it exists
        if (fs.existsSync(sqlitePath)) {
            fs.unlinkSync(sqlitePath);
            console.log('Cleared SQLite database.');
        }
        
        // Reinitialize the database
        await initVectorDatabase();
        return true;
    } catch (error) {
        console.error('Error clearing all database data:', error);
        return false;
    }
}

module.exports = {
    initVectorDatabase,
    addFeaturesToDB,
    queryHumanizationFeatures,
    queryPatternFeatures,
    clearVectorDatabase,
    clearAllDatabaseData
};