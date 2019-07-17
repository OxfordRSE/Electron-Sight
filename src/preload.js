const { dialog, ipcRenderer } = require('electron');

window.electron = {};
window.electron.ipcRenderer = ipcRenderer;
window.electron.dialog = dialog;
