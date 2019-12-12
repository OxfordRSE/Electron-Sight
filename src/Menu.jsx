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

import DefaultMode from './ApplicationState';

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
      mode: DefaultMode(),
      brightness_active: false,
      contrast_active: false,
      classifier_name: "Classifier",
      svm_cost: 0,
      svm_gamma: 0,
      superpixel_size: 100,
      //building_zoom: props.classifier.state.building_zoom,
      brightness: 1,
      contrast: 1
    };
  }

  openFile(nodeData) {
    const nextMode = this.state.mode.openFile(this, nodeData);
    this.setState({ mode: nextMode });
  }

  animClick() {
    const nextMode = this.state.mode.animClick(this);
    this.setState({ mode: nextMode });
  }

  predict() {
    const nextMode = this.state.mode.predict(this);
    this.setState({ mode: nextMode });
  }

  run_predict() {
    this.props.predict.onPredict();
  }

  buildClick() {
    const nextMode = this.state.mode.buildClick(this);
    this.setState({ mode: nextMode });
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

  viewerChangeHandler(key) {
    return value => {
      this.props.viewer.setState({
        [key]: value
      });
      this.setState({
        [key]: value
      });
    }
  }

  classifierChangeHandler(key) {
    return value => {
      this.props.classifier[`set_${key}`](value);
      this.setState({
        [key]: value
      });
    }
  }

  render() {
    const directory = fs.realpathSync('.');
    let file_tree = (
      <FileTree path={directory} 
        open_file_callback = {this.openFile.bind(this)}
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
            active={this.state.mode.annotateButtonActive()} 
            onClick={this.animClick.bind(this)}
            disabled = {this.state.mode.annotateButtonDisabled()}
      >
        Annotation
      </Button>
    );

    let classifier = (
      <Button 
            icon="build" 
            active={this.state.mode.classifierButtonActive()} 
            onClick={this.buildClick.bind(this)}
            disabled = {this.state.mode.classifierButtonDisabled()}
      >
        New classifier
      </Button>
    );

    let classifier_popdown = this.state.mode.classifierPopdown(this);

    let brightness = (
      <Button icon="flash" active={this.state.brightness_active}
              disabled = {this.state.mode.brightnessButtonDisabled()}
              onClick={this.toggle("brightness")}>Brightness</Button>
    );

    let brightness_popdown = (
      <Slider className="MenuDropdown" min={0} max={2} stepSize={0.1}
                onChange={this.viewerChangeHandler("brightness")}
                value={this.state.brightness} />
    );

    let contrast = (
      <Button icon="contrast" active={this.state.contrast_active}
              disabled = {this.state.mode.contrastButtonDisabled()}
              onClick={this.toggle("contrast")}>Contrast</Button>
    );

    let predict = (
      <Button 
            icon="circle"
            active={this.state.mode.predictButtonActive()}
            onClick={this.predict.bind(this)}
            disabled = {this.state.mode.predictButtonDisabled()}
      >
        Predict
      </Button>
    );

    let predict_popdown = this.state.mode.predictPopdown(this);

    let contrast_popdown = (
      <Slider className="MenuDropdown" min={0} max={2} stepSize={0.1}
                  onChange={this.viewerChangeHandler("contrast")}
                  value={this.state.contrast} />
    );

    return (
      <Card id="Menu" interactive={true} elevation={Elevation.TWO}>
      <ButtonGroup vertical={true} alignText="left">
        {file}
        {annotation}
        {classifier}
        {classifier_popdown}
        {predict}
        {predict_popdown}
        {brightness}
        {this.state.brightness_active && brightness_popdown}
        {contrast}
        {this.state.contrast_active && contrast_popdown}
      </ButtonGroup>
    </Card>
    );
  }
}

export default Menu;
