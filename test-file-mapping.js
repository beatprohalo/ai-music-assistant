// Test script to verify file mapping from database to renderer format
const StatusSystem = require('./status-system-simple');
const path = require('path');
const os = require('os');

async function testFileMapping() {
    console.log('🧪 Testing file mapping from database to renderer format...\n');
    
    const userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'ai-music-assistant');
    const statusSystem = new StatusSystem(userDataPath);
    await statusSystem.initialize();
    
    // Get files from database
    const dbFiles = await statusSystem.getAllFiles();
    console.log(`📁 Database contains ${dbFiles.length} files`);
    
    // Map to renderer format (same as in renderer.js)
    const mappedFiles = dbFiles.map(file => ({
        path: file.filePath,
        name: file.fileName,
        type: file.fileType,
        size: file.fileSize,
        category: file.category,
        analysis: file.analysisData,
        addedAt: file.createdAt
    }));
    
    console.log(`📁 Mapped ${mappedFiles.length} files to renderer format`);
    
    // Test the filtering that the renderer uses
    const audioCount = mappedFiles.filter(f => f.type === 'audio').length;
    const midiCount = mappedFiles.filter(f => f.type === 'midi').length;
    
    console.log('\n📊 File type counts:');
    console.log(`🎵 Audio Files: ${audioCount}`);
    console.log(`🎹 MIDI Files: ${midiCount}`);
    console.log(`📁 Total Files: ${mappedFiles.length}`);
    
    // Show first few files
    console.log('\n📁 First 5 files:');
    mappedFiles.slice(0, 5).forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name} (${file.type})`);
    });
    
    if (audioCount > 0 && midiCount > 0) {
        console.log('\n✅ File mapping is working correctly!');
        console.log('The app should now display the correct file counts.');
    } else {
        console.log('\n❌ File mapping issue detected.');
    }
}

testFileMapping().catch(console.error);
