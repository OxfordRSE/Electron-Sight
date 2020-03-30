import React from 'react';

import {
  Card,
  Elevation,
  Tree,
  ButtonGroup,
  Button,
  Position,
  Slider,
  Popover,
} from "@blueprintjs/core";

import Viewer from './Viewer';
import AnalyticsContainer from './AnalyticsContainer';

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

  render() {
    const {
      data
    } = this.state;
    return (
      <Tree
                contents={data}
                onNodeClick={this.props.open_file_callback}
            />
    );
  }
}

class Menu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      brightness_active: false,
      contrast_active: false,
      analytics_active: false,
      brightness: 1,
      contrast: 1
    };
  }

  fileOpened(data) {
    const tile_source = this.viewer.openseadragon.world.getItemAt(0).source;
    const max_zoom = tile_source.maxLevel;
    this.props.updateClassifierZoom(max_zoom);
  }

  run_predict() {
    this.props.predict.onPredict();
  }

  toggle(key) {
    return () => {
      this.setState(state => ({
        [key + "_active"]: !state[key + "_active"],
      }))
    }
  }

  inputGroupChangeHandler(key) {
    return event => {
      this.setState({
        [key]: event.target.value
      });
    }
  }

  changeHandler(key) {
    const defaultHandler = value => {
      this.setState({
        [key]: value
      });
    };
    return defaultHandler;
  }

  render() {
    const directory = fs.realpathSync('.');
    let file_tree = (
      <FileTree path={directory} 
        open_file_callback = {(nodeData) => { 
                                this.props.openFile(this, nodeData); 
                                this.viewer.annotations.props.loadAnnotationsFromStore(nodeData.path);
                              }}
        openseadragon={this.props.openseadragon}/>
    );

    let file = (
      <Popover 
        content={file_tree}
        position = {Position.RIGHT_TOP} 
      >
        <Button icon="document" rightIcon={"caret-right"}>File</Button> 
      </Popover>
    );

    let annotation = (
      <Button 
            icon="polygon-filter" 
            active={this.props.mode.annotateButtonActive()} 
            onClick={() => { this.props.animClick(this); }}
            disabled = {this.props.mode.annotateButtonDisabled()}
      >
        Annotation
      </Button>
    );

    let annotation_popdown = this.props.mode.annotationPopdown(this);

    let classifier = (
      <Button 
            icon="build" 
            active={this.props.mode.classifierButtonActive()} 
            onClick={() => {this.props.buildClick(this); }}
            disabled = {this.props.mode.classifierButtonDisabled()}
      >
        New classifier
      </Button>
    );

    let classifier_popdown = this.props.mode.classifierPopdown(this);

    let brightness = (
      <Button icon="flash" active={this.state.brightness_active}
              disabled = {this.props.mode.brightnessButtonDisabled()}
              onClick={this.toggle("brightness")}>Brightness</Button>
    );

    let brightness_popdown = (
      <Slider className="MenuDropdown" min={0} max={2} stepSize={0.1}
                onChange={this.changeHandler("brightness")}
                value={this.state.brightness} />
    );

    let contrast = (
      <Button icon="contrast" active={this.state.contrast_active}
              disabled = {this.props.mode.contrastButtonDisabled()}
              onClick={this.toggle("contrast")}>Contrast</Button>
    );

    let predict = (
      <Button 
            icon="circle"
            active={this.props.mode.predictButtonActive()}
            onClick={() => { this.props.predict(this); }}
            disabled = {this.props.mode.predictButtonDisabled()}
      >
        Predict
      </Button>
    );

    let predict_popdown = this.props.mode.predictPopdown(this);

    let contrast_popdown = (
      <Slider className="MenuDropdown" min={0} max={2} stepSize={0.1}
                  onChange={this.changeHandler("contrast")}
                  value={this.state.contrast} />
    );

    let analytics = (
      <Button icon="analytics" active={this.state.analytics_active}
              disabled = {this.props.mode.analyticsButtonDisabled()}
              onClick={this.toggle("analytics")}>Analytics</Button>
    );

    return (
      <div>
      <Card id="Menu" interactive={true} elevation={Elevation.TWO}>
      <ButtonGroup id="MenuButtons" fill={true} vertical={true}>
        {file}
        {annotation}
        {annotation_popdown}
        {classifier}
        {classifier_popdown}
        {predict}
        {predict_popdown}
        {brightness}
        {this.state.brightness_active && brightness_popdown}
        {contrast}
        {this.state.contrast_active && contrast_popdown}
        {analytics}
      </ButtonGroup>
    </Card>
    {this.state.analytics_active && <AnalyticsContainer/>}
    <Viewer 
        mode = {this.props.mode}
        onClick = {(data) => { this.props.mode.viewerClick(this, data); }}
        onKeyDown = {(data) => { this.props.mode.keyDown(this, data); }}
        fileOpened = {this.fileOpened.bind(this)}
        brightness={this.state.brightness}
        contrast={this.state.contrast}
        ref={viewer => {this.viewer = viewer;}}
        tabindex = "0"
    />
    </div>
    );
  }
}

export default Menu;
