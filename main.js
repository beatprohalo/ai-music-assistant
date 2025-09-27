const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Test IPC handler first
    ipcMain.handle('test-ipc', async () => {
        console.log('Test IPC handler called');
        return { success: true, message: 'IPC is working' };
    });

    // IPC handlers for file dialogs
    ipcMain.handle('open-file-dialog', async () => {
        console.log('File dialog IPC handler called');
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                properties: ['openFile', 'multiSelections'],
                filters: [
                    { name: 'Audio & MIDI', extensions: ['mp3', 'wav', 'flac', 'aiff', 'aif', 'm4a', 'ogg', 'aac', 'mid', 'midi'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            console.log('File dialog result:', { canceled, filePaths });
            return canceled ? [] : filePaths;
        } catch (error) {
            console.error('File dialog error:', error);
            throw error;
        }
    });

    ipcMain.handle('open-folder-dialog', async (event) => {
        console.log('Folder dialog IPC handler called');
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                properties: ['openDirectory']
            });
            console.log('Folder dialog result:', { canceled, filePaths });
            return canceled ? null : filePaths[0];
        } catch (error) {
            console.error('Folder dialog error:', error);
            throw error;
        }
    });

    // Alternative IPC handler using ipcMain.on
    ipcMain.on('open-folder-dialog-sync', async (event) => {
        console.log('Folder dialog sync IPC handler called');
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                properties: ['openDirectory']
            });
            console.log('Folder dialog sync result:', { canceled, filePaths });
            event.reply('folder-dialog-result', canceled ? null : filePaths[0]);
        } catch (error) {
            console.error('Folder dialog sync error:', error);
            event.reply('folder-dialog-error', error.message);
        }
    });

    // IPC handler for opening settings window
    ipcMain.handle('open-settings-window', async () => {
        const settingsWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1000,
            minHeight: 700,
            frame: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            }
        });

        settingsWindow.loadFile('settings.html');
        return true;
    });

    // IPC handler for opening main window
    ipcMain.handle('open-main-window', async () => {
        const newMainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1000,
            minHeight: 700,
            frame: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            }
        });

        newMainWindow.loadFile('index.html');
        return true;
    });

    // IPC handler for opening test window
    ipcMain.handle('open-test-window', async () => {
        const testWindow = new BrowserWindow({
            width: 800,
            height: 600,
            minWidth: 600,
            minHeight: 400,
            frame: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            }
        });

        testWindow.loadFile('test-buttons.html');
        return true;
    });

    // IPC handler for opening settings test window
    ipcMain.handle('open-settings-test-window', async () => {
        const testWindow = new BrowserWindow({
            width: 800,
            height: 600,
            minWidth: 600,
            minHeight: 400,
            frame: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        testWindow.loadFile('test-settings.html');
        return true;
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
