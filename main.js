const {
  app,
  BrowserWindow,
  Menu
} = require('electron');

let win = null;

const menu_template = [{
  label: 'File',
  submenu: [{
      label: 'Open',
      click: () => {
        console.log('Open Clicked');
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
