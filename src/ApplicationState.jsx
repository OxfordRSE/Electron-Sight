import React from 'react';
import {
  Callout,
  InputGroup,
  Button,
  Slider,
  HTMLSelect,
  FormGroup,
} from "@blueprintjs/core";

const truth = () => true;
const falsity = () => false;
const nothingness = () => null;


function AbstractMode() {
  if (!(this instanceof AbstractMode)) {
    return new AbstractMode();
  }
  this.modeName = "Abstract";
}

AbstractMode.prototype.viewerClick = function(menu, data) {
  return this;
}

AbstractMode.prototype.animClick = function(menu) {
  menu.viewer.annotations.startDrawing();
  return new AnnotateMode();
}
  
AbstractMode.prototype.predict = function(menu) {
  menu.viewer.predict.startDrawing();
  return new PredictMode();
}

AbstractMode.prototype.openFile = function(menu, nodeData) {
    const filename = nodeData.path;
    const extension = filename.split('.').pop();
    if (extension == 'dzi') {
        console.log(`opening dzi file ${filename}`);
        menu.viewer.openseadragon.open('file://' + nodeData.path)
    } else if (extension == 'ndpi') {
        console.log(`opening ndpi file ${filename}`);

    } else {
        console.log(`unknown extension ${extension} for file ${filename}`);
        return this;
    }
  return new ViewMode();
};

AbstractMode.prototype.annotateButtonActive = falsity;
AbstractMode.prototype.annotateButtonDisabled = falsity;
AbstractMode.prototype.classifierButtonActive = falsity;
AbstractMode.prototype.classifierButtonDisabled = falsity;
AbstractMode.prototype.classifierPopdown = nothingness;
AbstractMode.prototype.brightnessButtonDisabled = falsity;
AbstractMode.prototype.contrastButtonDisabled = falsity;
AbstractMode.prototype.predictButtonActive = falsity;
AbstractMode.prototype.predictButtonDisabled = falsity;
AbstractMode.prototype.predictPopdown = nothingness;

function DisabledMode() {
  if (!(this instanceof DisabledMode)) {
    return new DisabledMode();
  }
  this.modeName = "Disabled";
}

DisabledMode.prototype = new AbstractMode();

DisabledMode.prototype.buildClick = function() {
  return new DisabledMode();
};

DisabledMode.prototype.annotateButtonDisabled = truth;
DisabledMode.prototype.classifierButtonDisabled = truth;
DisabledMode.prototype.brightnessButtonDisabled = truth;
DisabledMode.prototype.contrastButtonDisabled = truth;
DisabledMode.prototype.predictButtonDisabled = truth;

function AnnotateMode() {
  if (!(this instanceof AnnotateMode)) {
    return new AnnotateMode();
  }
  this.modeName = "Annotate";
}

AnnotateMode.prototype = new AbstractMode();

AnnotateMode.prototype.animClick = function(menu) {
  menu.viewer.annotations.endDrawing();
  return new ViewMode();
}

AnnotateMode.prototype.buildClick = function(menu) {
  menu.viewer.annotations.endDrawing();
  menu.viewer.classifier.startBuilding();
  return new BuildClassifierMode();
}

AnnotateMode.prototype.viewerClick = function(menu, data) {
  menu.viewer.annotations.onClick(data);
  return this;
}

AnnotateMode.prototype.annotateButtonActive = truth;

function ViewMode() {
  if (!(this instanceof ViewMode)) {
    return new ViewMode();
  }
  this.modeName = "View";
}

ViewMode.prototype = new AbstractMode();

ViewMode.prototype.buildClick = function(menu) {
  menu.viewer.classifier.startBuilding();
  return new BuildClassifierMode();
}

function BuildClassifierMode() {
  if (!(this instanceof BuildClassifierMode)) {
    return new BuildClassifierMode();
  }
  this.modename = "BuildClassifier";
}

BuildClassifierMode.prototype = new AbstractMode();

BuildClassifierMode.prototype.animClick = function(menu) {
  menu.viewer.classifier.endBuilding();
  return AbstractMode.prototype.animClick.call(this, menu);
}

BuildClassifierMode.prototype.buildClick = function(menu) {
  menu.viewer.classifier.endBuilding();
  return new ViewMode();
}

BuildClassifierMode.prototype.viewerClick = function(menu, data) {
  menu.viewer.classifier.onClick(data);
  return this;
}

BuildClassifierMode.prototype.zoom_levels = function(menu) {
  var zoom_levels = [];
  if (menu.viewer.openseadragon.world.getItemAt(0)) {
    const tile_source = menu.viewer.openseadragon.world.getItemAt(0).source;
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
            onChange={menu.changeHandler("building_zoom")}
        />
    </FormGroup>
    
    <FormGroup
        label="Superpixel size"
        labelFor="superpixel-size"
    >
      <Slider min={10} max={500} stepSize={10} labelStepSize = {100}
              onRelease={menu.viewer.classifier.update_superpixel_size}
              onChange={menu.changeHandler("superpixel_size")}
              value={menu.state.superpixel_size} 
      />
    </FormGroup>
    <FormGroup
            label="SVM cost (10^x)"
            labelFor="svm-cost"
        >
          <Slider id="svm-cost" min={-15} max={15} stepSize={1} labelStepSize = {2}
                  onChange={menu.changeHandler("svm_cost")}
                  value={menu.state.svm_cost} 
          />
        </FormGroup>
        <FormGroup
            label="SVM gamma (10^x)"
            labelFor="svm-gamma"
        >
          <Slider id="svm-gamma" min={-15} max={15} stepSize={1} labelStepSize = {2}
                  onChange={menu.changeHandler("svm_gamma")}
                  value={menu.state.svm_gamma} 
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
        onClick={menu.viewer.classifier.buildClassifier}
    >
      Build new classifier...
    </Button>
    </div>
  );
}

BuildClassifierMode.prototype.predict = function(menu) {
    menu.viewer.classifier.endBuilding();
    return AbstractMode.prototype.predict.call(this, menu);
}

BuildClassifierMode.prototype.classifierButtonActive = truth;

function PredictMode() {
  if (!(this instanceof PredictMode)) {
    return new PredictMode();
  }
  this.modeName = "Predict";
}

PredictMode.prototype = new AbstractMode();

PredictMode.prototype.animClick = function(menu) {
    menu.viewer.predict.endDrawing();
    return AbstractMode.prototype.animClick.call(this, menu);
}

PredictMode.prototype.buildClick = function(menu) {
    menu.viewer.predict.endDrawing();
    menu.viewer.classifier.startBuilding();
    return new BuildClassifierMode();
  }

PredictMode.prototype.predict = function(menu) {
    menu.viewer.predict.endDrawing();
    return new ViewMode();
}

PredictMode.prototype.viewerClick = function(menu, data) {
  menu.viewer.predict.onClick(data);
  return this;
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

PredictMode.prototype.predictButtonActive = truth;

const DefaultMode = () => new DisabledMode();

export default DefaultMode;
