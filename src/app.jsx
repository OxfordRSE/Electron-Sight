import React, {PureComponent} from 'react';
const electron = window.require('electron');
import {Treebeard} from 'react-treebeard';
const remote = electron.remote
const fs = remote.require('fs');


class FileTree extends React.Component {
    constructor(props){
        super(props);
        var path = props.path;
        this.state = {data: FileTree.readDir(path)};
    }

    static readDir(path) {
        var data = {
          name: 'Click on a file to open',
          toggled: true,
          children: []
        };

        fs.readdirSync(path).forEach(file => {
            var fileInfo = {
              name: file,
              path: `${path}/${file}`,
              children: []
            };

            var stat = fs.statSync(fileInfo.path);

            if (stat.isDirectory()){
                //fileInfo.items = FileTree.readDir(fileInfo.path);
            }

            data.children.push(fileInfo)
        });

        return data;
    }

    onToggle(node, toggled){
        viewer.open('file://' + node.path)
    }

    render() {
        const {data} = this.state;
        return (
            <Treebeard
                data={data}
                onToggle={this.onToggle}
            />
        );
    }
}


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
    return (<div id="Viewer" style={style}>
    </div>);
  }
}


class Panels extends React.Component {
  render() {
    const directory = fs.realpathSync('.');
    //const directory = '.';

    return (
        <div id="LeftPane">
          <FileTree path={directory} />
      </div>
    );
  }
}

export default class App extends React.Component {
  render() {
    return (
      <div>
      <Viewer />
      <Panels />
      </div>
    );
  }
}
