import React, {
  PureComponent
} from 'react';
import {
  Card,
  Elevation,
  Callout,
  InputGroup,
  Tree,
  ButtonGroup,
  ITreeNode,
  Button,
  Position,
  Slider,
  Popover,
  Drawer,
  HTMLSelect,
  FormGroup,
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

const anyModeOpenFile = (menu, nodeData) => {
  menu.props.openseadragon.open('file://' + nodeData.path);
  return new ViewMode();
}

const truth = () => true;
const falsity = () => false;
const nothingness = () => null;

function DisabledMode() {
  if (!(this instanceof DisabledMode)) {
    return new DisabledMode();
  }
}

DisabledMode.prototype.buildClick = function() {
  return new DisabledMode();
};

DisabledMode.prototype.animClick = function(menu) {
  menu.props.annotations.startDrawing();
  return new AnnotateMode();
};

DisabledMode.prototype.openFile = anyModeOpenFile;
DisabledMode.prototype.annotateButtonActive = falsity;
DisabledMode.prototype.annotateButtonDisabled = truth;
DisabledMode.prototype.classifierButtonActive = falsity;
DisabledMode.prototype.classifierButtonDisabled = truth;
DisabledMode.prototype.classifierPopdown = nothingness;
DisabledMode.prototype.brightnessButtonDisabled = truth;
DisabledMode.prototype.contrastButtonDisabled = falsity;
DisabledMode.prototype.zoom_levels = () => [];

function AnnotateMode() {
  if (!(this instanceof AnnotateMode)) {
    return new AnnotateMode();
  }
}

AnnotateMode.prototype.animClick = function(menu) {
  menu.props.annotations.endDrawing();
  return new ViewMode();
}

AnnotateMode.prototype.buildClick = function(menu) {
  menu.props.annotations.endDrawing();
  const tile_source = menu.props.openseadragon.world.getItemAt(0).source;
  const max_zoom = tile_source.maxLevel;
  menu.props.classifier.startBuilding(max_zoom, menu.state.superpixel_size);
  return new ViewMode();
}

AnnotateMode.prototype.zoom_levels = function(menu) {
  var zoom_levels = [];
  if (menu.props.openseadragon.world.getItemAt(0)) {
    const tile_source = menu.props.openseadragon.world.getItemAt(0).source;
    const max_zoom = tile_source.maxLevel;
    const min_zoom = tile_source.minLevel;
    zoom_levels = [...Array(max_zoom - min_zoom).keys()].map(x => x + min_zoom +
      1).reverse();
  }
  return zoom_levels;
}

AnnotateMode.prototype.openFile = anyModeOpenFile;
AnnotateMode.prototype.annotateButtonActive = truth;
AnnotateMode.prototype.annotateButtonDisabled = falsity;
AnnotateMode.prototype.classifierButtonActive = falsity;
AnnotateMode.prototype.classifierButtonDisabled = falsity;
AnnotateMode.prototype.classifierPopdown = nothingness;
AnnotateMode.prototype.brightnessButtonDisabled = falsity;
AnnotateMode.prototype.contrastButtonDisabled = falsity;

function ViewMode() {
  if (!(this instanceof ViewMode)) {
    return new ViewMode();
  }
}

ViewMode.prototype.animClick = function(menu) {
  menu.props.annotations.startDrawing();
  return new AnnotateMode();
}

ViewMode.prototype.buildClick = function(menu) {
  const tile_source = menu.props.openseadragon.world.getItemAt(0).source;
  const max_zoom = tile_source.maxLevel;
  menu.props.classifier.startBuilding(max_zoom, menu.state.superpixel_size);
  return new BuildClassifierMode();
}

ViewMode.prototype.zoom_levels = function(menu) {
  var zoom_levels = [];
  if (menu.props.openseadragon.world.getItemAt(0)) {
    const tile_source = menu.props.openseadragon.world.getItemAt(0).source;
    const max_zoom = tile_source.maxLevel;
    const min_zoom = tile_source.minLevel;
    zoom_levels = [...Array(max_zoom - min_zoom).keys()].map(x => x + min_zoom +
      1).reverse();
  }
  return zoom_levels;
}

ViewMode.prototype.openFile = anyModeOpenFile;
ViewMode.prototype.annotateButtonActive = falsity;
ViewMode.prototype.annotateButtonDisabled = falsity;
ViewMode.prototype.classifierButtonActive = falsity;
ViewMode.prototype.classifierButtonDisabled = falsity;
ViewMode.prototype.classifierPopdown = nothingness;
ViewMode.prototype.brightnessButtonDisabled = falsity;
ViewMode.prototype.contrastButtonDisabled = falsity;

function BuildClassifierMode() {
  if (!(this instanceof BuildClassifierMode)) {
    return new BuildClassifierMode();
  }
}

BuildClassifierMode.prototype.animClick = function(menu) {
  menu.props.classifier.endBuilding();
  menu.props.annotations.startDrawing();
  return new AnnotateMode();
}

BuildClassifierMode.prototype.buildClick = function(menu) {
  menu.props.classifier.endBuilding();
  return new ViewMode();
}

BuildClassifierMode.prototype.zoom_levels = function(menu) {
  var zoom_levels = [];
  if (menu.props.openseadragon.world.getItemAt(0)) {
    const tile_source = menu.props.openseadragon.world.getItemAt(0).source;
    const max_zoom = tile_source.maxLevel;
    const min_zoom = tile_source.minLevel;
    zoom_levels = [...Array(max_zoom - min_zoom).keys()].map(x => x + min_zoom +
      1).reverse();
  }
  return zoom_levels;
}

BuildClassifierMode.prototype.classifierPopdown = function(menu, zoom_levels) {
  return (
    <div className="MenuDropdown" >
    <Callout
        intent="primary"
    >
    <p>Click to label regions of interest (green)</p>
    <p>Shift-click to label regions of non-interest (red)</p>
    </Callout>       
    <FormGroup
        label="Zoom level"
        labelFor="classifier-zoom-level"
        inline = {true}
    >
        <HTMLSelect 
            id="classifier-zoom-level"
            options={zoom_levels} 
            onChange={menu.props.classifier.setZoomLevel.bind(menu.props.classifier)}
            //value={this.props.classifier.state.zoom_level}
        />
    </FormGroup>
    
    <FormGroup
        label="Superpixel size"
        labelFor="superpixel-size"
    >
      <Slider min={10} max={500} stepSize={10} labelStepSize = {490}
              onRelease={menu.props.classifier.setSuperpixelSize.bind(menu.props.classifier)}
              onChange={menu.changeHandler("superpixel_size")}
              value={menu.state.superpixel_size} 
      />
    </FormGroup>
    <FormGroup
        label="Name"
        labelFor="classifier-name"
    >
      <InputGroup id="classifier-name" placeholder={menu.state.classifier_name}
              onChange={menu.inputGroupChangeHandler("classifier_name")}         
      />
    </FormGroup>
    <Button 
        fill={false}
        onClick={menu.buildClassifier.bind(menu)}
    >
      Build new classifier...
    </Button>
    </div>
  );
}

BuildClassifierMode.prototype.openFile = anyModeOpenFile;
BuildClassifierMode.prototype.annotateButtonActive = falsity;
BuildClassifierMode.prototype.annotateButtonDisabled = falsity;
BuildClassifierMode.prototype.classifierButtonActive = truth;
BuildClassifierMode.prototype.classifierButtonDisabled = falsity;
BuildClassifierMode.prototype.brightnessButtonDisabled = falsity;
BuildClassifierMode.prototype.contrastButtonDisabled = falsity;

class Menu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: new DisabledMode(),
      superpixel_size: 100,
      brightness_active: false,
      contrast_active: false,
      classifier_name: "Classifier",
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

  buildClick() {
    const nextMode = this.state.mode.buildClick(this);
    this.setState({ mode: nextMode });
  }


  buildClassifier() {
    this.props.classifier.buildClassifier(this.state.classifier_name);
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

    const zoom_levels = this.state.mode.zoom_levels(this);

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

    let classifier_popdown = this.state.mode.classifierPopdown(this, zoom_levels);

    let brightness = (
      <Button icon="flash" active={this.state.brightness_active}
              disabled = {this.state.mode.brightnessButtonDisabled()}
              onClick={this.toggle("brightness")}>Brightness</Button>
    );

    let brightness_popdown = (
      <Slider className="MenuDropdown" min={0} max={2} stepSize={0.1}
                onChange={this.changeHandler("brightness")}
                value={this.state.brightness} />
    );

    let contrast = (
      <Button icon="contrast" active={this.state.contrast_active}
              disabled = {this.state.mode.contrastButtonDisabled()}
              onClick={this.toggle("contrast")}>Contrast</Button>
    );

    let contrast_popdown = (
      <Slider className="MenuDropdown" min={0} max={2} stepSize={0.1}
                  onChange={this.changeHandler("contrast")}
                  value={this.state.contrast} />
    );

    return (
      <Card id="Menu" interactive={true} elevation={Elevation.TWO}>
      <ButtonGroup vertical={true} alignText="left">
        {file}
        {annotation}
        {classifier}
        {classifier_popdown}
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
