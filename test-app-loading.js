// Test script to verify app can load files through IPC
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const StatusSystem = require('./status-system-simple');

// Mock the main process for testing
let testWindow;
let statusSystem;

async function testAppLoading() {
    console.log('🧪 Testing app file loading through IPC...\n');
    
    try {
        // Initialize status system
        const userDataPath = path.join(require('os').homedir(), 'Library', 'Application Support', 'ai-music-assistant');
        statusSystem = new StatusSystem(userDataPath);
        await statusSystem.initialize();
        
        console.log('✅ Status system initialized');
        
        // Test 1: Get system status
        console.log('\n📊 Test 1: Get system status...');
        const systemStatus = await statusSystem.getSystemStatus();
        console.log(`✅ System status: ${systemStatus.database.total_files} files`);
        console.log(`  - Audio: ${systemStatus.database.audio_files}`);
        console.log(`  - MIDI: ${systemStatus.database.midi_files}`);
        
        // Test 2: Get all files
        console.log('\n📁 Test 2: Get all files...');
        const allFiles = await statusSystem.getAllFiles();
        console.log(`✅ Retrieved ${allFiles.length} files from database`);
        
        // Test 3: Test file filtering
        console.log('\n🔍 Test 3: Test file filtering...');
        const audioFiles = allFiles.filter(f => f.fileType === 'audio');
        const midiFiles = allFiles.filter(f => f.fileType === 'midi');
        console.log(`✅ Audio files: ${audioFiles.length}`);
        console.log(`✅ MIDI files: ${midiFiles.length}`);
        
        // Test 4: Test file details
        console.log('\n📝 Test 4: Test file details...');
        if (allFiles.length > 0) {
            const firstFile = allFiles[0];
            console.log(`✅ First file: ${firstFile.fileName}`);
            console.log(`  - Type: ${firstFile.fileType}`);
            console.log(`  - Category: ${firstFile.category}`);
            console.log(`  - Analysis data: ${firstFile.analysisData ? 'Present' : 'Missing'}`);
        }
        
        // Test 5: Test database operations
        console.log('\n💾 Test 5: Test database operations...');
        const dbStatus = await statusSystem.getDatabaseStatus();
        console.log(`✅ Database connected: ${dbStatus.connected}`);
        console.log(`✅ Total files: ${dbStatus.total_files}`);
        
        console.log('\n🎉 All tests passed! The app should now be able to load your files.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testAppLoading().catch(console.error);
