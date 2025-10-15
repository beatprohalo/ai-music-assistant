// bundle-database.js - Script to prepare database for bundling

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * This script copies your analyzed library database into the app bundle
 * so it gets packaged with the distributed app
 */

async function bundleDatabase() {
    try {
        // Source: Your current user data database
        const userDataPath = app.getPath('userData');
        const sourcePath = path.join(userDataPath, 'HumanizerAI', 'library.db');
        
        // Destination: App bundle (gets packaged)
        const bundlePath = path.join(__dirname, 'bundled-data', 'library.db');
        
        // Create bundled-data directory
        const bundleDir = path.dirname(bundlePath);
        if (!fs.existsSync(bundleDir)) {
            fs.mkdirSync(bundleDir, { recursive: true });
        }
        
        // Copy database
        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, bundlePath);
            console.log('✅ Database bundled successfully!');
            console.log(`Source: ${sourcePath}`);
            console.log(`Bundle: ${bundlePath}`);
        } else {
            console.log('❌ No database found to bundle');
            console.log(`Expected: ${sourcePath}`);
        }
        
    } catch (error) {
        console.error('Error bundling database:', error);
    }
}

// Run if called directly
if (require.main === module) {
    bundleDatabase();
}

module.exports = { bundleDatabase };