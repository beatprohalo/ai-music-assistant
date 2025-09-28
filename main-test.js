const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: true
        }
    });

    mainWindow.loadFile('test-buttons.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Test IPC handler
    ipcMain.handle('test-ipc', async () => {
        console.log('Test IPC handler called');
        return { success: true, message: 'IPC is working from test' };
    });

    // IPC handlers for file dialogs
    ipcMain.handle('open-file-dialog', async () => {
        console.log('File dialog requested');
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
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
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        console.log('Folder dialog result:', { canceled, filePaths });
        return canceled ? null : filePaths[0];
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
