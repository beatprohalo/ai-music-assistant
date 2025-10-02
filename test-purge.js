#!/usr/bin/env node

// test-purge.js
// Test script to verify purge functionality works

const { initVectorDatabase, addFeaturesToDB, clearAllDatabaseData, queryHumanizationFeatures } = require('./vector-database');

async function testPurgeFunctionality() {
    console.log('🧪 Testing Purge Functionality...\n');
    
    try {
        // Test 1: Initialize database
        console.log('1. Initializing database...');
        const dbResult = await initVectorDatabase();
        if (dbResult) {
            console.log('✅ Database initialized successfully');
        } else {
            console.log('❌ Database initialization failed');
            return;
        }
        
        // Test 2: Add some test data
        console.log('\n2. Adding test data...');
        const testFileData = {
            path: '/test/audio1.wav',
            name: 'test-audio1.wav',
            size: 1024000,
            type: 'audio',
            category: 'test',
            tags: ['humanize', 'pattern'],
            humanizationFeatures: {
                featureVector: Array.from({ length: 50 }, () => Math.random()),
                metadata: { tempo: 120, key: 'C major' }
            },
            patternFeatures: {
                featureVector: Array.from({ length: 50 }, () => Math.random()),
                metadata: { genre: 'jazz', mood: 'upbeat' }
            }
        };
        
        await addFeaturesToDB(testFileData);
        console.log('✅ Test data added');
        
        // Test 3: Verify data exists
        console.log('\n3. Verifying data exists...');
        const queryVector = Array.from({ length: 50 }, () => Math.random());
        const results = await queryHumanizationFeatures(queryVector, 5);
        console.log(`✅ Found ${results.length} humanization features`);
        
        // Test 4: Purge database
        console.log('\n4. Purging database...');
        const purgeResult = await clearAllDatabaseData();
        if (purgeResult) {
            console.log('✅ Database purged successfully');
        } else {
            console.log('❌ Database purge failed');
            return;
        }
        
        // Test 5: Verify data is gone
        console.log('\n5. Verifying data is purged...');
        const resultsAfterPurge = await queryHumanizationFeatures(queryVector, 5);
        console.log(`✅ Found ${resultsAfterPurge.length} humanization features (should be 0)`);
        
        if (resultsAfterPurge.length === 0) {
            console.log('\n🎉 Purge functionality works correctly!');
            console.log('✅ Database can be purged and rescanning is ready');
        } else {
            console.log('\n❌ Purge functionality failed - data still exists');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
if (require.main === module) {
    testPurgeFunctionality().catch(console.error);
}

module.exports = { testPurgeFunctionality };
