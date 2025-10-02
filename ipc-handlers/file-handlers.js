const { ipcMain, dialog, app } = require('electron');
const fs = require('fs').promises;
const path = require('path');

let mainWindow;
let cancelFolderScan = false;

function initializeFileHandlers(win) {
    mainWindow = win;
}

async function scanFolderSafe(dir, visited = new Set()) {
    if (visited.has(dir) || cancelFolderScan) return [];
    visited.add(dir);

    let files = [];
    try {
        // Add timeout to readdir operation
        const readDirPromise = fs.readdir(dir, { withFileTypes: true });
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Directory read timeout for: ${dir}`)), 30000); // 30 second timeout per directory
        });
        
        const entries = await Promise.race([readDirPromise, timeoutPromise]);
        
        for (const entry of entries) {
            if (cancelFolderScan) {
                console.log('Folder scan cancelled');
                break;
            }
            
            const fullPath = path.join(dir, entry.name);
            
            // Skip hidden files and common system directories
            if (entry.name.startsWith('.') || 
                entry.name === 'node_modules' || 
                entry.name === 'System Volume Information' ||
                entry.name === '$RECYCLE.BIN' ||
                entry.name === 'Thumbs.db') {
                continue;
            }
            
            try {
                if (entry.isDirectory()) {
                    // Add a small delay to prevent overwhelming the system
                    await new Promise(resolve => setImmediate(resolve));
                    
                    // Recursive call with timeout protection
                    const subFiles = await scanFolderSafe(fullPath, visited);
                    files = files.concat(subFiles);
                } else if (/\.(mp3|wav|flac|m4a|aiff|aif|ogg|aac|mid|midi)$/i.test(entry.name)) {
                    files.push(fullPath);
                    
                    // Send progress updates every 10 files
                    if (files.length % 10 === 0) {
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('folder-scan-progress', files.length);
                        }
                    }
                }
            } catch (innerErr) {
                console.warn('Skipping file/folder:', fullPath, innerErr.message);
            }
        }
    } catch (err) {
        console.error('Error reading folder:', dir, err.message);
        // Don't throw here, just log and continue
    }
    return files;
}

ipcMain.handle('open-file-dialog', async () => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Audio & MIDI', extensions: ['mp3', 'wav', 'flac', 'aiff', 'aif', 'm4a', 'ogg', 'aac', 'mid', 'midi'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        return canceled ? [] : filePaths;
    } catch (error) {
        console.error('File dialog error:', error);
        throw error;
    }
});

ipcMain.handle('open-audio-dialog', async () => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'aiff', 'aif', 'm4a', 'ogg', 'aac'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        return canceled ? [] : filePaths;
    } catch (error) {
        console.error('Audio dialog error:', error);
        throw error;
    }
});

ipcMain.handle('open-midi-dialog', async () => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'MIDI Files', extensions: ['mid', 'midi'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        return canceled ? [] : filePaths;
    } catch (error) {
        console.error('MIDI dialog error:', error);
        throw error;
    }
});

ipcMain.handle('open-folder-dialog', async () => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        return canceled ? null : filePaths[0];
    } catch (error) {
        console.error('Folder dialog error:', error);
        throw error;
    }
});

ipcMain.on('open-folder-dialog-sync', async (event) => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        event.reply('folder-dialog-result', canceled ? null : filePaths[0]);
    } catch (error) {
        console.error('Folder dialog sync error:', error);
        event.reply('folder-dialog-error', error.message);
    }
});

ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return data;
    } catch (error) {
        console.error('File read error:', error);
        throw error;
    }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
        await fs.writeFile(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        console.error('File write error:', error);
        throw error;
    }
});

ipcMain.handle('check-file-exists', async (event, filePath) => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
});

ipcMain.handle('create-directory', async (event, dirPath) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
        return { success: true };
    } catch (error) {
        console.error('Directory creation error:', error);
        throw error;
    }
});

ipcMain.handle('get-user-data-path', () => {
    return app.getPath('userData');
});

ipcMain.handle('read-directory', async (event, dirPath) => {
    try {
        const files = await fs.readdir(dirPath);
        return files;
    } catch (error) {
        console.error('Directory read error:', error);
        throw error;
    }
});

ipcMain.handle('scan-folder-safe', async (event, dir) => {
    cancelFolderScan = false;
    try {
        // Add overall timeout to the entire scan operation
        const scanPromise = scanFolderSafe(dir);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                cancelFolderScan = true; // Cancel the scan
                reject(new Error('Folder scan operation timed out after 4 minutes'));
            }, 240000); // 4 minutes total timeout
        });
        
        const files = await Promise.race([scanPromise, timeoutPromise]);
        console.log(`Scan completed: Found ${files.length} files in ${dir}`);
        return files;
    } catch (error) {
        console.error('Folder scan error:', error);
        cancelFolderScan = true; // Ensure cancellation flag is set
        throw error;
    }
});

ipcMain.on('cancel-folder-scan', () => {
    console.log('Received cancel-folder-scan signal');
    cancelFolderScan = true;
});

ipcMain.handle('download-file', async (event, { filePath }) => {
    try {
        // Determine file type from extension
        const ext = path.extname(filePath).toLowerCase();
        const isMidi = ext === '.mid' || ext === '.midi';
        
        const { canceled, filePath: savePath } = await dialog.showSaveDialog(mainWindow, {
            defaultPath: filePath,
            filters: [
                { name: isMidi ? 'MIDI Files' : 'JSON Files', extensions: [isMidi ? 'mid' : 'json'] }
            ]
        });

        if (canceled) {
            return { success: false, reason: 'cancelled' };
        }

        // Copy the file to the new location
        await fs.copyFile(filePath, savePath);
        return { success: true, path: savePath, message: `File saved to ${savePath}` };
    } catch (error) {
        console.error('Download error:', error);
        throw error;
    }
});

ipcMain.on('show-in-folder', (event, filePath) => {
    app.showItemInFolder(filePath);
});

ipcMain.handle('cancel-folder-scan', async () => {
    console.log('Received cancel-folder-scan signal');
    cancelFolderScan = true;
    return { success: true };
});

ipcMain.on('cancel-folder-scan', () => {
    console.log('Received cancel-folder-scan signal');
    cancelFolderScan = true;
});

module.exports = { initializeFileHandlers, scanFolderSafe };
