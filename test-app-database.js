// Comprehensive test script for AI Music Assistant database functionality
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Mock the main process for testing
let testWindow;
let testResults = [];

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
    testResults.push({ timestamp, type, message });
}

async function runDatabaseTests() {
    console.log('🧪 Starting comprehensive database tests for AI Music Assistant...\n');
    
    try {
        // Test 1: Basic database operations
        await testBasicDatabaseOperations();
        
        // Test 2: File save simulation
        await testFileSaveSimulation();
        
        // Test 3: Database persistence
        await testDatabasePersistence();
        
        // Test 4: Error handling
        await testErrorHandling();
        
        // Test 5: Performance test
        await testPerformance();
        
        // Print summary
        printTestSummary();
        
    } catch (error) {
        log(`Test suite failed: ${error.message}`, 'error');
    }
}

async function testBasicDatabaseOperations() {
    log('📋 Test 1: Basic Database Operations', 'info');
    
    const StatusSystem = require('./status-system-simple');
    const os = require('os');
    
    const testDir = path.join(os.homedir(), 'test-ai-music-db');
    const statusSystem = new StatusSystem(testDir);
    
    try {
        // Initialize
        const initResult = await statusSystem.initialize();
        if (initResult) {
            log('Database initialization: SUCCESS', 'success');
        } else {
            log('Database initialization: FAILED', 'error');
            return;
        }
        
        // Add files
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
            const result = await statusSystem.addFile(file);
            if (result.success) {
                log(`Added file ${file.fileName}: SUCCESS`, 'success');
            } else {
                log(`Added file ${file.fileName}: FAILED - ${result.error}`, 'error');
            }
        }
        
        // Retrieve files
        const allFiles = await statusSystem.getAllFiles();
        log(`Retrieved ${allFiles.length} files: SUCCESS`, 'success');
        
        // Get status
        const status = await statusSystem.getSystemStatus();
        log(`System status: ${status.database.total_files} files`, 'info');
        
    } catch (error) {
        log(`Basic operations test failed: ${error.message}`, 'error');
    } finally {
        // Cleanup
        try {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            log(`Cleanup warning: ${cleanupError.message}`, 'warning');
        }
    }
}

async function testFileSaveSimulation() {
    log('📁 Test 2: File Save Simulation', 'info');
    
    // Simulate the exact data structure that renderer.js sends
    const mockRendererData = {
        filePath: '/test/simulation/audio-test.mp3',
        fileName: 'audio-test.mp3',
        fileType: 'audio',
        fileSize: 2048000,
        category: 'simulation',
        analysisData: {
            tempo: 128,
            key: 'F major',
            instruments: ['guitar', 'bass', 'drums'],
            features: {
                energy: 0.9,
                danceability: 0.8,
                valence: 0.7
            }
        }
    };
    
    const StatusSystem = require('./status-system-simple');
    const os = require('os');
    
    const testDir = path.join(os.homedir(), 'test-simulation-db');
    const statusSystem = new StatusSystem(testDir);
    
    try {
        await statusSystem.initialize();
        
        // Test the exact data structure from renderer.js
        const result = await statusSystem.addFile(mockRendererData);
        
        if (result.success) {
            log('File save simulation: SUCCESS', 'success');
            log(`File ID: ${result.fileId}`, 'info');
            
            // Verify the file was saved correctly
            const files = await statusSystem.getAllFiles();
            const savedFile = files.find(f => f.fileName === mockRendererData.fileName);
            
            if (savedFile) {
                log('File verification: SUCCESS', 'success');
                log(`Saved file type: ${savedFile.fileType}`, 'info');
                log(`Saved file category: ${savedFile.category}`, 'info');
            } else {
                log('File verification: FAILED - File not found in database', 'error');
            }
        } else {
            log(`File save simulation: FAILED - ${result.error}`, 'error');
        }
        
    } catch (error) {
        log(`File save simulation failed: ${error.message}`, 'error');
    } finally {
        // Cleanup
        try {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            log(`Cleanup warning: ${cleanupError.message}`, 'warning');
        }
    }
}

async function testDatabasePersistence() {
    log('💾 Test 3: Database Persistence', 'info');
    
    const StatusSystem = require('./status-system-simple');
    const os = require('os');
    
    const testDir = path.join(os.homedir(), 'test-persistence-db');
    const statusSystem = new StatusSystem(testDir);
    
    try {
        // First session - add files
        await statusSystem.initialize();
        
        const testFile = {
            filePath: '/test/persistence/test.mp3',
            fileName: 'test.mp3',
            fileType: 'audio',
            fileSize: 1024000,
            category: 'persistence',
            analysisData: { test: 'data' }
        };
        
        const addResult = await statusSystem.addFile(testFile);
        if (!addResult.success) {
            log(`Add file failed: ${addResult.error}`, 'error');
            return;
        }
        
        log('File added in first session: SUCCESS', 'success');
        
        // Second session - check if file persists
        const statusSystem2 = new StatusSystem(testDir);
        await statusSystem2.initialize();
        
        const files = await statusSystem2.getAllFiles();
        const persistedFile = files.find(f => f.fileName === testFile.fileName);
        
        if (persistedFile) {
            log('File persistence: SUCCESS', 'success');
            log(`Persisted file ID: ${persistedFile.id}`, 'info');
        } else {
            log('File persistence: FAILED - File not found after restart', 'error');
        }
        
    } catch (error) {
        log(`Database persistence test failed: ${error.message}`, 'error');
    } finally {
        // Cleanup
        try {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            log(`Cleanup warning: ${cleanupError.message}`, 'warning');
        }
    }
}

async function testErrorHandling() {
    log('🚨 Test 4: Error Handling', 'info');
    
    const StatusSystem = require('./status-system-simple');
    const os = require('os');
    
    const testDir = path.join(os.homedir(), 'test-error-db');
    const statusSystem = new StatusSystem(testDir);
    
    try {
        await statusSystem.initialize();
        
        // Test with invalid data
        const invalidFile = {
            // Missing required fields
            fileName: 'invalid.mp3'
        };
        
        const result = await statusSystem.addFile(invalidFile);
        
        if (result.success) {
            log('Error handling: FAILED - Should have failed with invalid data', 'error');
        } else {
            log('Error handling: SUCCESS - Correctly handled invalid data', 'success');
        }
        
    } catch (error) {
        log(`Error handling test failed: ${error.message}`, 'error');
    } finally {
        // Cleanup
        try {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            log(`Cleanup warning: ${cleanupError.message}`, 'warning');
        }
    }
}

async function testPerformance() {
    log('⚡ Test 5: Performance Test', 'info');
    
    const StatusSystem = require('./status-system-simple');
    const os = require('os');
    
    const testDir = path.join(os.homedir(), 'test-performance-db');
    const statusSystem = new StatusSystem(testDir);
    
    try {
        await statusSystem.initialize();
        
        const startTime = Date.now();
        const fileCount = 10;
        
        // Add multiple files
        for (let i = 0; i < fileCount; i++) {
            const file = {
                filePath: `/test/performance/file${i}.mp3`,
                fileName: `file${i}.mp3`,
                fileType: 'audio',
                fileSize: 1024000,
                category: 'performance',
                analysisData: { index: i }
            };
            
            await statusSystem.addFile(file);
        }
        
        const addTime = Date.now() - startTime;
        log(`Added ${fileCount} files in ${addTime}ms`, 'info');
        
        // Retrieve all files
        const retrieveStart = Date.now();
        const files = await statusSystem.getAllFiles();
        const retrieveTime = Date.now() - retrieveStart;
        
        log(`Retrieved ${files.length} files in ${retrieveTime}ms`, 'info');
        
        if (files.length === fileCount) {
            log('Performance test: SUCCESS', 'success');
        } else {
            log(`Performance test: FAILED - Expected ${fileCount}, got ${files.length}`, 'error');
        }
        
    } catch (error) {
        log(`Performance test failed: ${error.message}`, 'error');
    } finally {
        // Cleanup
        try {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            log(`Cleanup warning: ${cleanupError.message}`, 'warning');
        }
    }
}

function printTestSummary() {
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const successCount = testResults.filter(r => r.type === 'success').length;
    const errorCount = testResults.filter(r => r.type === 'error').length;
    const warningCount = testResults.filter(r => r.type === 'warning').length;
    const infoCount = testResults.filter(r => r.type === 'info').length;
    
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⚠️ Warnings: ${warningCount}`);
    console.log(`ℹ️ Info: ${infoCount}`);
    console.log(`📝 Total: ${testResults.length}`);
    
    if (errorCount === 0) {
        console.log('\n🎉 All tests passed! Database functionality is working correctly.');
    } else {
        console.log('\n⚠️ Some tests failed. Check the error messages above.');
    }
    
    console.log('\n💡 To test the actual app:');
    console.log('1. Run: npm start');
    console.log('2. Open the app');
    console.log('3. Try uploading a file');
    console.log('4. Check if it appears in the database');
}

// Run the tests
runDatabaseTests().catch(console.error);
