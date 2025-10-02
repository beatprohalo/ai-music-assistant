// Migration script to convert JSON data to database format
const StatusSystem = require('./status-system-simple');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function migrateJsonToDatabase() {
    console.log('🔄 Migrating JSON data to database...\n');
    
    const userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'ai-music-assistant');
    const jsonPath = path.join(userDataPath, 'HumanizerAI', 'data.json');
    
    try {
        // Read the JSON data
        console.log('📁 Reading JSON data from:', jsonPath);
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        
        console.log(`📊 Found ${jsonData.loadedFiles?.length || 0} files in JSON data`);
        
        if (!jsonData.loadedFiles || jsonData.loadedFiles.length === 0) {
            console.log('❌ No files found in JSON data');
            return;
        }
        
        // Initialize the status system
        const statusSystem = new StatusSystem(userDataPath);
        await statusSystem.initialize();
        
        console.log('✅ Status system initialized');
        
        // Migrate each file
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < jsonData.loadedFiles.length; i++) {
            const file = jsonData.loadedFiles[i];
            
            try {
                // Convert JSON format to database format
                const dbFile = {
                    filePath: file.path,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: 0, // We don't have file size in JSON
                    category: 'migrated',
                    analysisData: file.analysis || {}
                };
                
                const result = await statusSystem.addFile(dbFile);
                
                if (result.success) {
                    successCount++;
                    if (i % 50 === 0) {
                        console.log(`📝 Migrated ${i + 1}/${jsonData.loadedFiles.length} files...`);
                    }
                } else {
                    errorCount++;
                    console.log(`⚠️ Failed to migrate ${file.name}: ${result.error}`);
                }
                
            } catch (error) {
                errorCount++;
                console.log(`❌ Error migrating ${file.name}: ${error.message}`);
            }
        }
        
        console.log(`\n📊 Migration completed:`);
        console.log(`✅ Successfully migrated: ${successCount} files`);
        console.log(`❌ Failed to migrate: ${errorCount} files`);
        console.log(`📁 Total files processed: ${jsonData.loadedFiles.length}`);
        
        // Verify the migration
        const allFiles = await statusSystem.getAllFiles();
        console.log(`\n🔍 Verification: ${allFiles.length} files now in database`);
        
        const status = await statusSystem.getSystemStatus();
        console.log(`📊 Database status:`);
        console.log(`  - Total files: ${status.database.total_files}`);
        console.log(`  - Audio files: ${status.database.audio_files}`);
        console.log(`  - MIDI files: ${status.database.midi_files}`);
        
        if (successCount > 0) {
            console.log('\n🎉 Migration successful! The app should now load your existing files.');
        } else {
            console.log('\n⚠️ No files were migrated. Check the error messages above.');
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

// Run the migration
migrateJsonToDatabase().catch(console.error);
