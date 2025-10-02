// Test script to verify database save functionality
const StatusSystem = require('./status-system-simple');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function testDatabaseSave() {
    console.log('🧪 Testing database save functionality...\n');
    
    // Create a test directory
    const testDir = path.join(os.homedir(), 'test-ai-music-assistant');
    console.log(`📁 Using test directory: ${testDir}`);
    
    try {
        // Initialize the status system
        const statusSystem = new StatusSystem(testDir);
        const initResult = await statusSystem.initialize();
        console.log(`✅ Status system initialized: ${initResult}\n`);
        
        // Test 1: Add a single file
        console.log('📝 Test 1: Adding a single file...');
        const testFile1 = {
            filePath: '/test/path/audio1.mp3',
            fileName: 'audio1.mp3',
            fileType: 'audio',
            fileSize: 1024000,
            category: 'test',
            analysisData: { 
                tempo: 120, 
                key: 'C major',
                instruments: ['guitar', 'piano'],
                features: { energy: 0.8, danceability: 0.7 }
            }
        };
        
        const result1 = await statusSystem.addFile(testFile1);
        console.log(`   Result: ${result1.success ? '✅ Success' : '❌ Failed'}`);
        if (result1.success) {
            console.log(`   File ID: ${result1.fileId}`);
        } else {
            console.log(`   Error: ${result1.error}`);
        }
        
        // Test 2: Add another file
        console.log('\n📝 Test 2: Adding a second file...');
        const testFile2 = {
            filePath: '/test/path/midi1.mid',
            fileName: 'midi1.mid',
            fileType: 'midi',
            fileSize: 512000,
            category: 'pattern',
            analysisData: { 
                tempo: 140, 
                key: 'G major',
                instruments: ['synth', 'drums'],
                chordProgression: ['G', 'Em', 'C', 'D']
            }
        };
        
        const result2 = await statusSystem.addFile(testFile2);
        console.log(`   Result: ${result2.success ? '✅ Success' : '❌ Failed'}`);
        if (result2.success) {
            console.log(`   File ID: ${result2.fileId}`);
        } else {
            console.log(`   Error: ${result2.error}`);
        }
        
        // Test 3: Get all files
        console.log('\n📋 Test 3: Retrieving all files...');
        const allFiles = await statusSystem.getAllFiles();
        console.log(`   Found ${allFiles.length} files in database:`);
        allFiles.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.fileName} (${file.fileType}) - ${file.category}`);
        });
        
        // Test 4: Get system status
        console.log('\n📊 Test 4: Getting system status...');
        const status = await statusSystem.getSystemStatus();
        console.log(`   Database Status:`);
        console.log(`   - Connected: ${status.database.connected}`);
        console.log(`   - Total files: ${status.database.total_files}`);
        console.log(`   - Audio files: ${status.database.audio_files}`);
        console.log(`   - MIDI files: ${status.database.midi_files}`);
        console.log(`   - Total size: ${status.database.total_size_mb} MB`);
        
        // Test 5: Check if data file exists
        console.log('\n💾 Test 5: Checking data file...');
        const dataPath = path.join(testDir, 'HumanizerAI', 'data.json');
        if (fs.existsSync(dataPath)) {
            console.log(`   ✅ Data file exists: ${dataPath}`);
            const dataContent = fs.readFileSync(dataPath, 'utf8');
            const data = JSON.parse(dataContent);
            console.log(`   - Files in data: ${data.files.length}`);
            console.log(`   - Last updated: ${data.lastUpdated}`);
        } else {
            console.log(`   ❌ Data file not found: ${dataPath}`);
        }
        
        // Test 6: Test file update
        console.log('\n🔄 Test 6: Testing file update...');
        if (allFiles.length > 0) {
            const firstFile = allFiles[0];
            const updateResult = await statusSystem.addFile({
                filePath: firstFile.filePath,
                fileName: firstFile.fileName,
                fileType: firstFile.fileType,
                fileSize: firstFile.fileSize,
                category: 'updated',
                analysisData: { ...firstFile.analysisData, updated: true }
            });
            console.log(`   Update result: ${updateResult.success ? '✅ Success' : '❌ Failed'}`);
        }
        
        console.log('\n🎉 Database test completed!');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    } finally {
        // Clean up test directory
        console.log('\n🧹 Cleaning up test directory...');
        try {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
                console.log('✅ Test directory cleaned up');
            }
        } catch (cleanupError) {
            console.log(`⚠️ Could not clean up test directory: ${cleanupError.message}`);
        }
    }
}

// Run the test
testDatabaseSave().catch(console.error);
