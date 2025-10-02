// Test download functionality
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

async function testDownloadFunctionality() {
    console.log('🧪 Testing download functionality...');
    
    try {
        // Create a test file
        const testContent = JSON.stringify({
            test: true,
            timestamp: new Date().toISOString(),
            message: 'This is a test file for download functionality'
        }, null, 2);
        
        const testFilePath = path.join(app.getPath('userData'), 'test-download.json');
        await fs.writeFile(testFilePath, testContent, 'utf8');
        console.log('✅ Test file created:', testFilePath);
        
        // Test the download handler
        const { shell } = require('electron');
        const downloadsPath = path.join(app.getPath('home'), 'Downloads');
        const fileName = 'test-download.json';
        const destinationPath = path.join(downloadsPath, fileName);
        
        console.log('📁 Downloads path:', downloadsPath);
        console.log('📁 Destination path:', destinationPath);
        
        // Copy file to Downloads
        await fs.copyFile(testFilePath, destinationPath);
        console.log('✅ File copied to Downloads folder');
        
        // Verify file exists
        const stats = await fs.stat(destinationPath);
        console.log('✅ File verified, size:', stats.size, 'bytes');
        
        // Show in folder
        shell.showItemInFolder(destinationPath);
        console.log('✅ Downloads folder opened');
        
        console.log('🎉 Download functionality test completed successfully!');
        
    } catch (error) {
        console.error('❌ Download test failed:', error);
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    app.whenReady().then(() => {
        testDownloadFunctionality().then(() => {
            app.quit();
        });
    });
}

module.exports = { testDownloadFunctionality };