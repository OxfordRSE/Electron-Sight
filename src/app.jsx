import React from 'react';
const electron = window.require('electron');
const remote = electron.remote
const fs = remote.require('fs');



class Viewer extends React.Component {
  componentDidMount() {
    const script = document.createElement("script");

    script.src = "viewer.js";
    script.async = true;

    document.body.appendChild(script);
  }
  render() {
    const size = electron.remote.getCurrentWindow().getBounds();
    console.log(size)
    const style = {
      width: size.width,
      height: size.height
    };
    return (<div className="viewer" id="Viewer" style={style}>
    </div>);
  }
}

export default class App extends React.Component {
  render() {
    return (
      <div className="app" id="App">
        <Viewer />
      </div>
    );
  }
}
