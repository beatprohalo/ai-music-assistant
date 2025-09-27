const statusDiv = document.getElementById('status');

function log(message) {
  statusDiv.innerHTML += `${message}<br>`;
  console.log(message);
}

log('Starting IPC test...');

window.electronAPI.handleIpcReply((event, message) => {
  if (message === 'IPC Success') {
    log('IPC Test Passed!');
  } else {
    log(`IPC Test Failed: ${message}`);
  }
  // In a real test runner, you'd close the app here
  // window.close();

  runFileDialogTest();
});

function runFileDialogTest() {
  log('Starting file dialog test...');
  window.electronAPI.openFile().then(filePath => {
    if (filePath === '/mock/path/to/file.txt') {
      log('File Dialog Test Passed!');
    } else {
      log(`File Dialog Test Failed: ${filePath}`);
    }
  });
}

window.electronAPI.sendTestMessage();
log('Sent "test-ipc" message to main process.');