import React from 'react';
import {
  Callout,
  InputGroup,
  Button,
  Slider,
  HTMLSelect,
  FormGroup,
} from "@blueprintjs/core";

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
  return new BuildClassifierMode();
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

const DefaultMode = () => new DisabledMode();

export default DefaultMode;
