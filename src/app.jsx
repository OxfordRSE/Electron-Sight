import React from 'react';

export default class Viewer extends React.Component {
  componentDidMount() {
    const script = document.createElement("script");

    script.src = "viewer.js";
    script.async = true;

    document.body.appendChild(script);
  }
  render() {
    return (<div>
    </div>);
  }
}

class FileOpen extends React.Component {
  componentDidMount() {
    window.electron.ipcRenderer.on('openFile', function(event, file) {
      console.log('openFile event for file:://' + file)
      viewer.open('file://' + file)

    })
  }

  handleClick() {
    window.electron.dialog.showOpenDialog({
      properties: ['openFile']
    }, (file) => {
      console.log(`opening ${file}`)
      mainWindow.webContents.send('openFile', file)
    })
  }

  render() {
    return (
      <button onClick={this.handleClick}>
        'Open File' 
      </button>
    );
  }
}
