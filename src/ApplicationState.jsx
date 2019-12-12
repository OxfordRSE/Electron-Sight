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
    const filename = nodeData.path;
    const extension = filename.split('.').pop();
    if (extension == 'dzi') {
        console.log(`opening dzi file ${filename}`);
        menu.props.openseadragon.open('file://' + nodeData.path)
    } else if (extension == 'ndpi') {
        console.log(`opening ndpi file ${filename}`);

    } else {
        console.log(`unknown extension ${extension} for file ${filename}`);
        return this;
    }
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

DisabledMode.prototype.predict = function(menu) {
    menu.props.predict.startDrawing();
    return new PredictMode();
}

DisabledMode.prototype.openFile = anyModeOpenFile;
DisabledMode.prototype.annotateButtonActive = falsity;
DisabledMode.prototype.annotateButtonDisabled = truth;
DisabledMode.prototype.classifierButtonActive = falsity;
DisabledMode.prototype.classifierButtonDisabled = truth;
DisabledMode.prototype.classifierPopdown = nothingness;
DisabledMode.prototype.brightnessButtonDisabled = truth;
DisabledMode.prototype.contrastButtonDisabled = truth;
DisabledMode.prototype.predictButtonActive = falsity;
DisabledMode.prototype.predictButtonDisabled = truth;
DisabledMode.prototype.predictPopdown = nothingness;

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

AnnotateMode.prototype.predict = function(menu) {
    menu.props.predict.startDrawing();
    return new PredictMode();
}

AnnotateMode.prototype.openFile = anyModeOpenFile;
AnnotateMode.prototype.annotateButtonActive = truth;
AnnotateMode.prototype.annotateButtonDisabled = falsity;
AnnotateMode.prototype.classifierButtonActive = falsity;
AnnotateMode.prototype.classifierButtonDisabled = falsity;
AnnotateMode.prototype.classifierPopdown = nothingness;
AnnotateMode.prototype.brightnessButtonDisabled = falsity;
AnnotateMode.prototype.contrastButtonDisabled = falsity;
AnnotateMode.prototype.predictButtonActive = falsity;
AnnotateMode.prototype.predictButtonDisabled = falsity;
AnnotateMode.prototype.predictPopdown = nothingness;

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

ViewMode.prototype.predict = function(menu) {
    menu.props.predict.startDrawing();
    return new PredictMode();
}

ViewMode.prototype.openFile = anyModeOpenFile;
ViewMode.prototype.annotateButtonActive = falsity;
ViewMode.prototype.annotateButtonDisabled = falsity;
ViewMode.prototype.classifierButtonActive = falsity;
ViewMode.prototype.classifierButtonDisabled = falsity;
ViewMode.prototype.classifierPopdown = nothingness;
ViewMode.prototype.brightnessButtonDisabled = falsity;
ViewMode.prototype.contrastButtonDisabled = falsity;
ViewMode.prototype.predictButtonActive = falsity;
ViewMode.prototype.predictButtonDisabled = falsity;
ViewMode.prototype.predictPopdown = nothingness;

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

BuildClassifierMode.prototype.classifierPopdown = function(menu) {
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
            options={this.zoom_levels(menu)} 
            onChange={menu.classifierChangeHandler("building_zoom")}
            //value={this.props.classifier.state.zoom_level}
        />
    </FormGroup>
    
    <FormGroup
        label="Superpixel size"
        labelFor="superpixel-size"
    >
      <Slider min={10} max={500} stepSize={10} labelStepSize = {100}
              onRelease={menu.props.classifier.update_superpixel_size}
              onChange={menu.classifierChangeHandler("superpixel_size")}
              value={menu.state.superpixel_size} 
      />
    </FormGroup>
    <FormGroup
            label="SVM cost (10^x)"
            labelFor="svm-cost"
        >
          <Slider id="svm-cost" min={-15} max={15} stepSize={1} labelStepSize = {2}
                  onChange={menu.classifierChangeHandler("svm_cost")}
                  value={menu.state.svm_cost} 
          />
        </FormGroup>
        <FormGroup
            label="SVM gamma (10^x)"
            labelFor="svm-gamma"
        >
          <Slider id="svm-gamma" min={-15} max={15} stepSize={1} labelStepSize = {2}
                  onChange={menu.classifierChangeHandler("svm_gamma")}
                  value={menu.state.svm_gamma} 
          />
        </FormGroup>
    <FormGroup
        label="Name"
        labelFor="classifier-name"
    >
      <InputGroup id="classifier-name" placeholder={menu.state.classifier_name}
              onChange={menu.classifierChangeHandler("classifier_name")}         
      />
    </FormGroup>
    <Button 
        fill={false}
        onClick={menu.props.classifier.buildClassifier}
    >
      Build new classifier...
    </Button>
    </div>
  );
}

BuildClassifierMode.prototype.predict = function(menu) {
    menu.props.classifier.endBuilding();
    menu.props.predict.startDrawing();
    return new PredictMode();
}

BuildClassifierMode.prototype.openFile = anyModeOpenFile;
BuildClassifierMode.prototype.annotateButtonActive = falsity;
BuildClassifierMode.prototype.annotateButtonDisabled = falsity;
BuildClassifierMode.prototype.classifierButtonActive = truth;
BuildClassifierMode.prototype.classifierButtonDisabled = falsity;
BuildClassifierMode.prototype.brightnessButtonDisabled = falsity;
BuildClassifierMode.prototype.contrastButtonDisabled = falsity;
BuildClassifierMode.prototype.predictButtonActive = falsity;
BuildClassifierMode.prototype.predictButtonDisabled = falsity;
BuildClassifierMode.prototype.predictPopdown = nothingness;

function PredictMode() {
  if (!(this instanceof PredictMode)) {
    return new PredictMode();
  }
}

PredictMode.prototype.predict = function(menu) {
    menu.props.predict.endDrawing();
    return new ViewMode();
}

PredictMode.prototype.predictPopdown = function(menu) {
    return (
        <div className="MenuDropdown" >
        <Callout
            intent="primary"
        >
        <p>Draw a region and predict within it</p>
        </Callout>
        <Button 
            fill={false}
            onClick={menu.run_predict.bind(menu)}
        >
          Go...
        </Button>
        </div>
      );
}

PredictMode.prototype.openFile = anyModeOpenFile;
PredictMode.prototype.annotateButtonActive = falsity;
PredictMode.prototype.annotateButtonDisabled = falsity;
PredictMode.prototype.classifierButtonActive = falsity;
PredictMode.prototype.classifierButtonDisabled = falsity;
PredictMode.prototype.classifierPopdown = nothingness;
PredictMode.prototype.brightnessButtonDisabled = falsity;
PredictMode.prototype.contrastButtonDisabled = falsity;
PredictMode.prototype.predictButtonActive = truth;
PredictMode.prototype.predictButtonDisabled = falsity;

const DefaultMode = () => new DisabledMode();

export default DefaultMode;
