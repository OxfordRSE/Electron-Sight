const {
  app,
  BrowserWindow,
  Menu,
  dialog
} = require('electron');

let win = null;

let mystring = 'test'

openFile = (file) => {

}

const menu_template = [{
  label: 'File',
  submenu: [{
      label: 'Open',
      click: () => {
        dialog.showOpenDialog({
          properties: ['openFile']
        }, (file) => {
          console.log(`main.js opening ${file}`)
          win.webContents.send('openFile', file)
        })
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]
}];


createWindow = () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  win.loadFile('index.html');

  win.webContents.openDevTools();

  win.on('closed', () => {
    win = null;
  });
}

createMenu = () => {
  const menu = Menu.buildFromTemplate(menu_template);
  Menu.setApplicationMenu(menu);
}


app.on('ready', function() {
  createWindow();
  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});
