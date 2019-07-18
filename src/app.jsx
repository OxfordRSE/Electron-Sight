import React, {PureComponent} from 'react';
const electron = window.require('electron');
import {
    Tree,
    ButtonGroup, 
    ITreeNode,
    Button,
    Position,
    Popover,
    Drawer,
} from "@blueprintjs/core";
const remote = electron.remote
const fs = remote.require('fs');


class FileTree extends React.Component {
    constructor(props){
        super(props);
        var path = props.path;
        this.state = {data: FileTree.readDir(path)};
        console.log(this.state.data)
    }

    static readDir(path) {
        var i = 0;
        var data = [];

        fs.readdirSync(path).forEach(file => {
            i += 1;

            var fileInfo = {
              id: i,
              label: file,
              path: `${path}/${file}`,
            };

            var stat = fs.statSync(fileInfo.path);

            if (stat.isDirectory()){
                //fileInfo.items = FileTree.readDir(fileInfo.path);
            }

            data.push(fileInfo)
        });

        return data;
    }

    handleNodeClick (nodeData: ITreeNode, _nodePath: number[], e: React.MouseEvent<HTMLElement>) {
      viewer.open('file://' + nodeData.path)
    }
     
    render() {
        const {data} = this.state;
        return (
            <Tree
                contents={data}
                onNodeClick={this.handleNodeClick}
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


class Menu extends React.Component {
  render() {
    const directory = fs.realpathSync('.');
    return (
        <ButtonGroup id="Menu" vertical={true}>
            <Popover content={<FileTree path={directory}/>} position={Position.RIGHT_TOP}>
              <Button icon="document" rightIcon={"caret-right"}>File</Button>
            </Popover>
        </ButtonGroup>
    );
  }
}

export default class App extends React.Component {

  render() {
    return (
      <div>
      <Viewer />
      <Menu />
      </div>
    );
  }
}
