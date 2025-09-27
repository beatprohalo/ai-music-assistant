const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

if (process.argv.includes('--test')) {
  dialog.showOpenDialog = async () => {
    return { canceled: false, filePaths: ['/mock/path/to/file.txt'] };
  };
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.argv.includes('--test')) {
    mainWindow.loadFile('test.html');
  } else {
    mainWindow.loadFile('index.html');
  }
}

const oled = {
  display: (message) => {
    console.log(`OLED Display: ${message}`);
  },
};

ipcMain.on('test-ipc', (event, arg) => {
  try {
    console.log('Main process received "test-ipc"');
    oled.display('IPC Test OK');
    event.reply('test-ipc-reply', 'IPC Success');
  } catch (error) {
    console.error('IPC Test Error:', error);
    oled.display(`IPC Test Error: ${error.message}`);
    event.reply('test-ipc-reply', `Error: ${error.message}`);
  }
});

ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({});
  if (!canceled && filePaths.length > 0) {
    return filePaths[0];
  }
  return null;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});