// Test script to verify database loading functionality
const StatusSystem = require('./status-system-simple');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function testDatabaseLoading() {
    console.log('🧪 Testing database loading functionality...\n');
    
    const testDir = path.join(os.homedir(), 'test-db-loading');
    console.log(`📁 Using test directory: ${testDir}`);
    
    try {
        // Test 1: Initialize with existing data
        console.log('📝 Test 1: Initialize with existing data...');
        const statusSystem = new StatusSystem(testDir);
        
        // Add some test files first
        await statusSystem.initialize();
        const testFiles = [
            {
                filePath: '/test/audio1.mp3',
                fileName: 'audio1.mp3',
                fileType: 'audio',
                fileSize: 1024000,
                category: 'test',
                analysisData: { tempo: 120, key: 'C major' }
            },
            {
                filePath: '/test/midi1.mid',
                fileName: 'midi1.mid',
                fileType: 'midi',
                fileSize: 512000,
                category: 'pattern',
                analysisData: { tempo: 140, key: 'G major' }
            }
        ];
        
        for (const file of testFiles) {
            await statusSystem.addFile(file);
        }
        
        console.log('✅ Added test files to database');
        
        // Test 2: Create new instance and load data
        console.log('\n📝 Test 2: Create new instance and load existing data...');
        const statusSystem2 = new StatusSystem(testDir);
        const initResult = await statusSystem2.initialize();
        
        if (initResult) {
            console.log('✅ New instance initialized successfully');
        } else {
            console.log('❌ New instance initialization failed');
            return;
        }
        
        // Test 3: Check if data was loaded
        console.log('\n📝 Test 3: Check if data was loaded...');
        const allFiles = await statusSystem2.getAllFiles();
        console.log(`✅ Loaded ${allFiles.length} files from database`);
        
        allFiles.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file.fileName} (${file.fileType}) - ${file.category}`);
        });
        
        // Test 4: Check database status
        console.log('\n📝 Test 4: Check database status...');
        const dbStatus = await statusSystem2.getDatabaseStatus();
        console.log(`✅ Database status: ${dbStatus.total_files} files, connected: ${dbStatus.connected}`);
        
        // Test 5: Check system status
        console.log('\n📝 Test 5: Check system status...');
        const systemStatus = await statusSystem2.getSystemStatus();
        console.log(`✅ System status retrieved successfully`);
        console.log(`  - Total files: ${systemStatus.database?.total_files || 0}`);
        console.log(`  - Audio files: ${systemStatus.database?.audio_files || 0}`);
        console.log(`  - MIDI files: ${systemStatus.database?.midi_files || 0}`);
        
        // Test 6: Test error handling with corrupted data
        console.log('\n📝 Test 6: Test error handling with corrupted data...');
        const corruptedDataPath = path.join(testDir, 'HumanizerAI', 'data.json');
        const originalData = fs.readFileSync(corruptedDataPath, 'utf8');
        
        // Corrupt the data file
        fs.writeFileSync(corruptedDataPath, '{"invalid": "json"');
        
        const statusSystem3 = new StatusSystem(testDir);
        const initResult3 = await statusSystem3.initialize();
        
        if (initResult3) {
            console.log('✅ Corrupted data handled gracefully');
            const files = await statusSystem3.getAllFiles();
            console.log(`  Files after corruption: ${files.length}`);
        } else {
            console.log('❌ Failed to handle corrupted data');
        }
        
        // Restore original data
        fs.writeFileSync(corruptedDataPath, originalData);
        
        console.log('\n🎉 Database loading test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Cleanup
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
testDatabaseLoading().catch(console.error);
