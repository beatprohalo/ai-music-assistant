const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class VectorDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.initializeDatabase();
  }

  initializeDatabase() {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    
    // Create tables
    this.createTables();
  }

  createTables() {
    // Files table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER,
        format TEXT,
        categories TEXT, -- JSON array
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Features table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS features (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER,
        feature_type TEXT NOT NULL,
        feature_data TEXT, -- JSON
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);

    // Embeddings table for vector similarity search
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER,
        embedding_type TEXT NOT NULL,
        embedding_vector TEXT, -- JSON array
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);

    // MIDI data table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS midi_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER,
        midi_data TEXT, -- JSON
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);

    // Library statistics view
    this.db.exec(`
      CREATE VIEW IF NOT EXISTS library_stats AS
      SELECT 
        COUNT(*) as total_files,
        SUM(CASE WHEN categories LIKE '%humanization%' THEN 1 ELSE 0 END) as humanization_files,
        SUM(CASE WHEN categories LIKE '%patterns%' THEN 1 ELSE 0 END) as pattern_files,
        SUM(file_size) as total_size
      FROM files
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_files_categories ON files(categories);
      CREATE INDEX IF NOT EXISTS idx_files_date ON files(date_added);
      CREATE INDEX IF NOT EXISTS idx_features_type ON features(feature_type);
      CREATE INDEX IF NOT EXISTS idx_embeddings_type ON embeddings(embedding_type);
    `);
  }

  async addFile(fileData) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO files (file_path, file_name, file_size, format, categories)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      fileData.filePath,
      fileData.fileName,
      fileData.fileSize,
      fileData.format,
      JSON.stringify(fileData.categories || [])
    );

    const fileId = result.lastInsertRowid;

    // Add features if available
    if (fileData.features) {
      const featureStmt = this.db.prepare(`
        INSERT INTO features (file_id, feature_type, feature_data)
        VALUES (?, ?, ?)
      `);
      featureStmt.run(fileId, 'audio_features', JSON.stringify(fileData.features));
    }

    // Add embeddings if available
    if (fileData.embeddings) {
      const embeddingStmt = this.db.prepare(`
        INSERT INTO embeddings (file_id, embedding_type, embedding_vector)
        VALUES (?, ?, ?)
      `);
      embeddingStmt.run(fileId, 'audio_embedding', JSON.stringify(fileData.embeddings));
    }

    // Add MIDI data if available
    if (fileData.midi) {
      const midiStmt = this.db.prepare(`
        INSERT INTO midi_data (file_id, midi_data)
        VALUES (?, ?)
      `);
      midiStmt.run(fileId, JSON.stringify(fileData.midi));
    }

    return fileId;
  }

  async getFileById(id) {
    const stmt = this.db.prepare(`
      SELECT f.*, 
             GROUP_CONCAT(fe.feature_type) as feature_types,
             GROUP_CONCAT(fe.feature_data) as feature_data
      FROM files f
      LEFT JOIN features fe ON f.id = fe.file_id
      WHERE f.id = ?
      GROUP BY f.id
    `);

    return stmt.get(id);
  }

  async getAllFiles(options = {}) {
    let query = `
      SELECT f.*, 
             GROUP_CONCAT(fe.feature_type) as feature_types,
             GROUP_CONCAT(fe.feature_data) as feature_data
      FROM files f
      LEFT JOIN features fe ON f.id = fe.file_id
    `;

    const conditions = [];
    const params = [];

    if (options.category) {
      conditions.push('f.categories LIKE ?');
      params.push(`%${options.category}%`);
    }

    if (options.search) {
      conditions.push('(f.file_name LIKE ? OR f.file_path LIKE ?)');
      params.push(`%${options.search}%`, `%${options.search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY f.id';

    if (options.sortBy) {
      const sortOrder = options.sortOrder || 'ASC';
      query += ` ORDER BY f.${options.sortBy} ${sortOrder}`;
    }

    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  async getLibraryStats() {
    const stmt = this.db.prepare(`
      SELECT * FROM library_stats
    `);
    return stmt.get();
  }

  async searchSimilar(embedding, options = {}) {
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Valid embedding vector required for similarity search');
    }

    // Get all embeddings with their file data
    const stmt = this.db.prepare(`
      SELECT f.*, e.embedding_vector
      FROM files f
      JOIN embeddings e ON f.id = e.file_id
      WHERE e.embedding_type = 'audio_embedding'
    `);

    const results = stmt.all();
    
    // Calculate cosine similarity for each embedding
    const similarities = results.map(row => {
      const storedEmbedding = JSON.parse(row.embedding_vector);
      const similarity = this.cosineSimilarity(embedding, storedEmbedding);
      return {
        ...row,
        similarity
      };
    });

    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Apply filters
    let filtered = similarities;
    
    if (options.category) {
      filtered = filtered.filter(row => 
        JSON.parse(row.categories).includes(options.category)
      );
    }

    if (options.minSimilarity) {
      filtered = filtered.filter(row => row.similarity >= options.minSimilarity);
    }

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  async clearLibrary() {
    this.db.exec('DELETE FROM files');
    this.db.exec('DELETE FROM features');
    this.db.exec('DELETE FROM embeddings');
    this.db.exec('DELETE FROM midi_data');
  }

  async deleteFile(fileId) {
    const stmt = this.db.prepare('DELETE FROM files WHERE id = ?');
    return stmt.run(fileId);
  }

  async updateFileCategories(fileId, categories) {
    const stmt = this.db.prepare(`
      UPDATE files 
      SET categories = ?, last_modified = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    return stmt.run(JSON.stringify(categories), fileId);
  }

  async getFilesByCategory(category) {
    const stmt = this.db.prepare(`
      SELECT * FROM files 
      WHERE categories LIKE ?
      ORDER BY date_added DESC
    `);
    return stmt.all(`%${category}%`);
  }

  async getRecentFiles(limit = 10) {
    const stmt = this.db.prepare(`
      SELECT * FROM files 
      ORDER BY date_added DESC 
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  async backupDatabase(backupPath) {
    const backup = this.db.backup(backupPath);
    return new Promise((resolve, reject) => {
      backup.step(-1, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = VectorDatabase;
