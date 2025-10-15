const sinon = require('sinon');
const fs = require('fs');

// Mock Electron's ipcMain
const mockIpcMain = {
    handle: sinon.stub(),
    on: sinon.stub()
};

// Mock the main window
const mainWindow = {
    webContents: {
        send: sinon.stub()
    }
};

// Mock fs.mkdirSync
sinon.stub(fs, 'mkdirSync');

// Replace the original ipcMain with our mock
require.cache[require.resolve('electron')] = {
    exports: {
        ipcMain: mockIpcMain,
        app: {
            getPath: sinon.stub().returns('/fake/path'),
            whenReady: sinon.stub().resolves(),
            on: sinon.stub()
        }
    }
};
global.mainWindow = mainWindow;