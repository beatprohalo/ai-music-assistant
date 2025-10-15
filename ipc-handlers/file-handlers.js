const { ipcMain, dialog, app } = require('electron');
const fs = require('fs').promises;
const path = require('path');

let mainWindow;
let cancelFolderScan = false;

// Safe logging function to prevent EPIPE errors
function safeLog(level, ...args) {
    try {
        console[level](...args);
    } catch (err) {
        // Silently ignore logging errors to prevent EPIPE
    }
}

function initializeFileHandlers(win) {
    mainWindow = win;
}

async function scanFolderSafe(dir, visited = new Set(), depth = 0, fileCount = 0) {
    if (visited.has(dir) || cancelFolderScan) return [];
    visited.add(dir);

    // Prevent scanning too deep (max 10 levels)
    if (depth > 10) {
        safeLog('warn', 'Maximum depth reached, skipping:', dir);
        return [];
    }

    // Limit total files to prevent memory issues (max 50000 files for large music libraries)
    if (fileCount > 50000) {
        safeLog('warn', 'Maximum file count reached, stopping scan');
        return [];
    }

    // Prevent scanning root directory or system paths
    if (dir === '/' || dir === '\\' || dir.startsWith('/System') || dir.startsWith('/Library') || 
        dir.startsWith('/usr') || dir.startsWith('/bin') || dir.startsWith('/sbin') ||
        dir.startsWith('/etc') || dir.startsWith('/var') || dir.startsWith('/tmp') ||
        dir.startsWith('/opt') || dir.startsWith('/private') || dir.startsWith('/cores') ||
        dir.startsWith('/dev') || dir.startsWith('/home') || dir.startsWith('/net') ||
        dir.startsWith('/mnt') || dir.startsWith('/proc') || dir.startsWith('/root') ||
        dir.startsWith('/run') || dir.startsWith('/srv') || dir.startsWith('/sys')) {
        safeLog('warn', 'Skipping system directory:', dir);
        return [];
    }

    // Additional protection for system directories within /Volumes
    if (dir.startsWith('/Volumes/') && (
        dir.includes('/System/') || dir.includes('/Library/') || 
        dir.includes('/usr/') || dir.includes('/bin/') || dir.includes('/sbin/') ||
        dir.includes('/etc/') || dir.includes('/var/') || dir.includes('/tmp/') ||
        dir.includes('/opt/') || dir.includes('/private/') || dir.includes('/cores/') ||
        dir.includes('/dev/') || dir.includes('/home/') || dir.includes('/net/') ||
        dir.includes('/mnt/') || dir.includes('/proc/') || dir.includes('/root/') ||
        dir.includes('/run/') || dir.includes('/srv/') || dir.includes('/sys/')
    )) {
        safeLog('warn', 'Skipping system directory within volume:', dir);
        return [];
    }

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
                safeLog('log', 'Folder scan cancelled');
                break;
            }
            
            const fullPath = path.join(dir, entry.name);
            
            // Skip hidden files and common system directories
            if (entry.name.startsWith('.') || 
                entry.name === 'node_modules' || 
                entry.name === 'System Volume Information' ||
                entry.name === '$RECYCLE.BIN' ||
                entry.name === 'Thumbs.db' ||
                entry.name === 'System' ||
                entry.name === 'Library' ||
                entry.name === 'Applications' ||
                entry.name === 'usr' ||
                entry.name === 'bin' ||
                entry.name === 'sbin' ||
                entry.name === 'etc' ||
                entry.name === 'var' ||
                entry.name === 'tmp' ||
                entry.name === 'opt' ||
                entry.name === 'private' ||
                entry.name === 'Volumes' ||
                entry.name === 'cores' ||
                entry.name === 'dev' ||
                entry.name === 'home' ||
                entry.name === 'net' ||
                entry.name === 'mnt' ||
                entry.name === 'proc' ||
                entry.name === 'root' ||
                entry.name === 'run' ||
                entry.name === 'srv' ||
                entry.name === 'sys') {
                continue;
            }
            
            try {
                if (entry.isDirectory()) {
                    // Add a proper delay to ensure thorough scanning
                    await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay per directory
                    
                    // Recursive call with timeout protection
                    const subFiles = await scanFolderSafe(fullPath, visited, depth + 1, fileCount + files.length);
                    files = files.concat(subFiles);
                } else if (/\.(mp3|wav|flac|m4a|aiff|aif|ogg|aac|mid|midi)$/i.test(entry.name)) {
                    files.push(fullPath);
                    
                    // Add small delay for each file to ensure proper recognition
                    await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay per file
                    
                    // Send progress updates every 10 files
                    if (files.length % 10 === 0) {
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('folder-scan-progress', files.length);
                        }
                    }
                }
            } catch (innerErr) {
                // Skip permission denied errors silently, log others
                if (innerErr.code === 'EACCES' || innerErr.code === 'EPERM') {
                    // Silently skip permission denied errors
                } else {
                    safeLog('warn', 'Skipping file/folder:', fullPath, innerErr.message);
                }
            }
        }
    } catch (err) {
        // Handle permission errors more gracefully
        if (err.code === 'EACCES' || err.code === 'EPERM') {
            safeLog('warn', 'Permission denied for directory:', dir);
        } else if (err.message.includes('timeout')) {
            safeLog('warn', 'Directory scan timeout:', dir);
        } else {
            safeLog('error', 'Error reading folder:', dir, err.message);
        }
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
        safeLog('error', 'File dialog error:', error);
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
        safeLog('error', 'Audio dialog error:', error);
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
        safeLog('error', 'MIDI dialog error:', error);
        throw error;
    }
});

ipcMain.handle('open-folder-dialog', async () => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        return canceled ? [] : filePaths;
    } catch (error) {
        safeLog('error', 'Folder dialog error:', error);
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
        safeLog('error', 'Folder dialog sync error:', error);
        event.reply('folder-dialog-error', error.message);
    }
});

ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return data;
    } catch (error) {
        safeLog('error', 'File read error:', error);
        throw error;
    }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
        await fs.writeFile(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        safeLog('error', 'File write error:', error);
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
        safeLog('error', 'Directory creation error:', error);
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
        safeLog('error', 'Directory read error:', error);
        throw error;
    }
});

ipcMain.handle('scan-folder-safe', async (event, dir) => {
    cancelFolderScan = false;
    try {
        // Add overall timeout to the entire scan operation (increased for large libraries)
        const scanPromise = scanFolderSafe(dir);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                cancelFolderScan = true; // Cancel the scan
                reject(new Error('Folder scan operation timed out after 15 minutes'));
            }, 900000); // 15 minutes total timeout for large music libraries
        });
        
        const files = await Promise.race([scanPromise, timeoutPromise]);
        safeLog('log', `Scan completed: Found ${files.length} files in ${dir}`);
        return files;
    } catch (error) {
        safeLog('error', 'Folder scan error:', error);
        cancelFolderScan = true; // Ensure cancellation flag is set
        throw error;
    }
});

ipcMain.on('cancel-folder-scan', () => {
    safeLog('log', 'Received cancel-folder-scan signal');
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
        safeLog('error', 'Download error:', error);
        throw error;
    }
});

ipcMain.on('show-in-folder', (event, filePath) => {
    app.showItemInFolder(filePath);
});

ipcMain.handle('cancel-folder-scan', async () => {
    safeLog('log', 'Received cancel-folder-scan signal');
    cancelFolderScan = true;
    return { success: true };
});

ipcMain.on('cancel-folder-scan', () => {
    safeLog('log', 'Received cancel-folder-scan signal');
    cancelFolderScan = true;
});

module.exports = { initializeFileHandlers, scanFolderSafe };
