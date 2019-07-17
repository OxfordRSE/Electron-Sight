import React from 'react';
const electron = window.require('electron');
const fs = electron.remote.require('fs');



class Viewer extends React.Component {
  componentDidMount() {
    const script = document.createElement("script");

    script.src = "viewer.js";
    script.async = true;

    document.body.appendChild(script);
  }
  render() {
    return (<div id="Viewer" style={{width: '790px', height: '550px'}}>
    </div>);
  }
}

export default class App extends React.Component {
  render() {
    return (
      <div className="app">
        <Viewer />
      </div>
    );
  }
}
