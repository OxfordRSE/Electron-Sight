import React, {PureComponent} from 'react';
import {
    Tree,
    ButtonGroup, 
    ITreeNode,
    Button,
    Position,
    Slider,
    Popover,
    Drawer,
} from "@blueprintjs/core";

const electron = window.require('electron');
const remote = electron.remote
const fs = remote.require('fs');

class FileTree extends React.Component {
    constructor(props){
        super(props);
        var path = props.path;
        this.state = {data: FileTree.readDir(path)};
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
      this.props.openseadragon.open('file://' + nodeData.path)
    }
     
    render() {
        const {data} = this.state;
        return (
            <Tree
                contents={data}
                onNodeClick={this.handleNodeClick.bind(this)}
            />
        );
    }
}



class Menu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      annotation_active: false,
      brightness_active: false,
      brightness: 1,
      contrast: 1
    };
  }

  animClick() {
    if (this.state.annotation_active) {
      this.props.annotations.endDrawing();
      this.setState({annotation_active: false});
    } else {
      this.props.annotations.startDrawing();
      this.setState({annotation_active: true});
    }
  }

  brightness() {
      this.setState(state => ({
          brightness_active: !state.brightness_active,
      }))
  }

  changeHandler(key) {
     return value => {this.props.viewer.setState({ [key]: value });
         this.setState({[key]: value});}
  }

  render() {
    const directory = fs.realpathSync('.');
    return (
        <ButtonGroup id="Menu" vertical={true}>
            <Popover content={<FileTree path={directory} openseadragon={this.props.openseadragon}/>} position={Position.RIGHT_TOP}>
              <Button icon="document" rightIcon={"caret-right"}>File</Button>
            </Popover>
            <Button icon="annotation" active={this.state.annotation_active} onClick={this.animClick.bind(this)}>Annotation</Button>
            <Button icon="flash" active={this.state.brightness_active} onClick={this.brightness.bind(this)}>Brightness</Button>
            {this.state.brightness_active &&
                <Slider min={1} max={5} stepSize={0.1}
                    onChange={this.changeHandler("brightness")}
                    value={this.state.brightness} />}

            <Button icon="contrast">Contrast</Button>
        </ButtonGroup>
    );
  }
}


export default Menu;
