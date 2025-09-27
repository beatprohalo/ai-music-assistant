const testIpcBtn = document.getElementById('test-ipc');

testIpcBtn.addEventListener('click', () => {
  console.log('Test IPC button clicked');
  window.electronAPI.sendTestMessage();
});

window.electronAPI.handleIpcReply((event, message) => {
  console.log('IPC Reply:', message);
});