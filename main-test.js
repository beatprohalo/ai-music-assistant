const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('test-upload.html');
}

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC handlers for file dialogs
ipcMain.handle('open-file-dialog', async () => {
    console.log('File dialog requested');
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Audio & MIDI', extensions: ['mp3', 'wav', 'flac', 'aiff', 'aif', 'm4a', 'ogg', 'aac', 'mid', 'midi'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    console.log('File dialog result:', { canceled, filePaths });
    return canceled ? [] : filePaths;
});

ipcMain.handle('open-folder-dialog', async () => {
    console.log('Folder dialog requested');
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    console.log('Folder dialog result:', { canceled, filePaths });
    return canceled ? null : filePaths[0];
});
