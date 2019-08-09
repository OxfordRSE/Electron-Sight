import React, {
  PureComponent
} from 'react';
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
  constructor(props) {
    super(props);
    var path = props.path;
    this.state = {
      data: FileTree.readDir(path)
    };
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

      if (stat.isDirectory()) {
        //fileInfo.items = FileTree.readDir(fileInfo.path);
      }

      data.push(fileInfo)
    });

    return data;
  }

  handleNodeClick(nodeData: ITreeNode, _nodePath: number[], e: React.MouseEvent <
    HTMLElement > ) {
    this.props.openseadragon.open('file://' + nodeData.path)
  }

  render() {
    const {
      data
    } = this.state;
    return (
      <Tree
                contents={data}
                onNodeClick={this.handleNodeClick.bind(this)}
            />
    );
  }
}

const Modes = {
    VIEW: 0,
    ANNOTATE: 1,
    BUILD_CLASSIFIER: 2
  };

class Menu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: Modes.VIEW,
      brightness_active: false,
      contrast_active: false,
      brightness: 1,
      contrast: 1
    };
  }

  animClick() {
    if (this.state.mode == Modes.ANNOTATE) {
      this.props.annotations.endDrawing();
      this.setState({
        mode: Modes.VIEW 
      });
    } else {
      if (this.state.mode == Modes.BUILD_CLASSIFIER) {
        this.props.classifier.endBuilding();
      }
      this.props.annotations.startDrawing();
      this.setState({
        mode: Modes.ANNOTATE 
      });
    }
  }

  buildClick() {
    if (this.state.mode == Modes.BUILD_CLASSIFIER) {
      this.props.classifier.endBuilding();
      this.setState({
        mode: Modes.VIEW 
      });
    } else {
      if (this.state.mode == Modes.ANNOTATE) {
        this.props.annotations.endDrawing();
      }
      this.props.classifier.startBuilding();
      this.setState({
        mode: Modes.BUILD_CLASSIFIER
      });
    }
  }

  toggle(key) {
    return () => {
      this.setState(state => ({
        [key + "_active"]: !state[key + "_active"],
      }))
    }
  }

  changeHandler(key) {
    return value => {
      this.props.viewer.setState({
        [key]: value
      });
      this.setState({
        [key]: value
      });
    }
  }

  render() {
    const directory = fs.realpathSync('.');
    return (
      <ButtonGroup id="Menu" vertical={true} alignText="left">
            <Popover content={<FileTree path={directory} openseadragon={this.props.openseadragon}/>} position={Position.RIGHT_TOP}>
              <Button icon="document" rightIcon={"caret-right"}>File</Button>
            </Popover>
            <Button icon="polygon-filter" active={this.state.mode == Modes.ANNOTATE} onClick={this.animClick.bind(this)}>Annotation</Button>
            <Button icon="build" active={this.state.mode == Modes.BUILD_CLASSIFIER} onClick={this.buildClick.bind(this)}>Build Classifier</Button>
            <Button icon="flash" active={this.state.brightness_active}
                onClick={this.toggle("brightness")}>Brightness</Button>
            {this.state.brightness_active &&
                <Slider min={0} max={2} stepSize={0.1}
                    onChange={this.changeHandler("brightness")}
                    value={this.state.brightness} />}
            <Button icon="contrast" active={this.state.contrast_active}
                onClick={this.toggle("contrast")}>Contrast</Button>
            {this.state.contrast_active &&
                <Slider min={0} max={2} stepSize={0.1}
                    onChange={this.changeHandler("contrast")}
                    value={this.state.contrast} />}
        </ButtonGroup>
    );
  }
}


export default Menu;
