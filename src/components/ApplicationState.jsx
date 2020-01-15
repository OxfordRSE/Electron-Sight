import React from 'react';
import {
  Callout,
  InputGroup,
  Button,
  ButtonGroup,
  Slider,
  HTMLSelect,
  FormGroup,
} from "@blueprintjs/core";

const spawn = require('child_process').spawn;
const path = require('path');
const truth = () => true;
const falsity = () => false;
const nothingness = () => null;

function execute(command, callback) {
    exec(command, (error, stdout, stderr) => {
        callback(stdout);
    });
};

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
  return new AnnotateMode();
}
  
AbstractMode.prototype.predict = function(menu) {
  menu.viewer.predict.startPredict();
  return new PredictMode();
}

AbstractMode.prototype.openFile = function(menu, nodeData) {
    const filename = nodeData.path;
    const extension = filename.split('.').pop();
    const re = /.*?(\d+)\% complete/
    if (extension == 'dzi') {
        console.log(`opening dzi file ${filename}`);
        menu.viewer.openseadragon.open('file://' + nodeData.path)
    } else if (extension == 'ndpi') {
        console.log(`opening ndpi file ${filename}`);
        var filebase = path.basename(filename, path.extname(filename));
        menu.viewer.setState({loading: true});
        menu.viewer.setState({loading_progress: 1});
        console.log('converting to dzi format');
        var converter = spawn('vips', ['dzSave', '--vips-progress', filename, filebase]);
        var matched;
        converter.stdout.setEncoding('utf8');
        converter.stdout.on('data', (data) => {
            matched = data.match(re);
            if(matched) {
                menu.viewer.setState({loading_progress: parseInt(matched[1]) / 100});
            };
        });
        converter.on('close', (code) => {
            if (code !== 0) {
                console.log('conversion failed');
            } else {
                console.log('conversion finished');
                menu.viewer.setState({loading: false});
                var created_dzi = 'file://' + path.dirname(filename) + '/' + filebase + '.dzi';
                menu.viewer.openseadragon.open(created_dzi);
            };
        });
    } else {
        console.log(`unknown extension ${extension} for file ${filename}`);
        return this;
    }
  return new ViewMode();
};

AbstractMode.prototype.annotateButtonActive = falsity;
AbstractMode.prototype.annotateButtonDisabled = falsity;
AbstractMode.prototype.annotationPopdown = nothingness;
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
  return new ViewMode();
}

AnnotateMode.prototype.buildClick = function(menu) {
  menu.viewer.classifier.startBuilding();
  return new BuildClassifierMode();
}

AnnotateMode.prototype.viewerClick = function(menu, data) {
  menu.viewer.annotations.onClick(data);
  return this;
}

AnnotateMode.prototype.annotateButtonActive = truth;

AnnotateMode.prototype.annotationPopdown = function(menu) {
  const annotations = menu.viewer.annotations;
  const current_name = annotations.props.annotations.get('current').get('name');
  const set_current_name = annotations.props.updateName;
  const save_annotation = annotations.props.saveAnnotation;
  return (
    <div className="MenuDropdown" >
    <Callout
        intent="primary"
    >
    <p>Click to create a polygon annotation</p>
    </Callout>       
    <FormGroup
        label="Name"
        labelFor="annotation-name"
    >
      <InputGroup id="annotation-name" 
                  placeholder={current_name} 
                  onChange={(evt) => (set_current_name(event.target.value))}         
      />
    </FormGroup>
    <ButtonGroup className="Buttons" fill={false}>
    <Button 
        onClick={save_annotation}
    >
      Save
    </Button>
    </ButtonGroup>
    </div>
  );
}

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
  this.modeName = "BuildClassifier";
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
            onChange={(evnt) => {
                        const zoom = evnt.target.value;
                        menu.props.updateClassifierZoom(zoom);
                        menu.viewer.classifier.updateZoom(zoom);
                      }}
        />
    </FormGroup>
    
    <FormGroup
        label="Superpixel size"
        labelFor="superpixel-size"
    >
      <Slider min={10} max={500} stepSize={10} labelStepSize = {100}
              onRelease={(size) => {menu.viewer.classifier.updateSuperpixelSize();}}
              onChange={menu.props.updateClassifierSuperpixelSize}
              value={menu.props.classifierSuperpixelSize} 
      />
    </FormGroup>
    <FormGroup
            label="SVM cost (10^x)"
            labelFor="svm-cost"
        >
          <Slider id="svm-cost" min={-15} max={15} stepSize={1} labelStepSize = {2}
                  onChange={menu.props.updateClassifierCost}
                  value={menu.props.classifierCost} 
          />
        </FormGroup>
        <FormGroup
            label="SVM gamma (10^x)"
            labelFor="svm-gamma"
        >
          <Slider id="svm-gamma" min={-15} max={15} stepSize={1} labelStepSize = {2}
                  onChange={menu.props.updateClassifierGamma}
                  value={menu.props.classifierGamma} 
          />
        </FormGroup>
    <FormGroup
        label="Name"
        labelFor="classifier-name"
    >
      <InputGroup id="classifier-name" value={menu.props.classifierName}
              onChange={(evnt) => {menu.props.updateClassifierName(evnt.target.value);}}
      />
    </FormGroup>
    <ButtonGroup fill={false} className="Buttons">
    <Button 
        disabled={menu.props.classifierName==''}
        onClick={() => {menu.viewer.classifier.buildClassifier();}}
    >Save</Button>
    <Button 
        disabled={!menu.props.classifiers.has(menu.props.classifierName)}
        onClick={() => {menu.viewer.classifier.loadClassifier(menu.props.classifierName);}}
    >Load</Button>
    </ButtonGroup>
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
    menu.viewer.predict.endPredict();
    return AbstractMode.prototype.animClick.call(this, menu);
}

PredictMode.prototype.buildClick = function(menu) {
    menu.viewer.predict.endPredict();
    menu.viewer.classifier.startBuilding();
    return new BuildClassifierMode();
  }

PredictMode.prototype.predict = function(menu) {
    menu.viewer.predict.endPredict();
    return new ViewMode();
}

PredictMode.prototype.predictPopdown = function(menu) {
  return (
      <div className="MenuDropdown" >
      <Callout
          intent="primary"
      >
      <p>Select a classifier and predict over all annotated areas</p>
      </Callout>
      <ButtonGroup className="Buttons"> 
      <Button 
          disabled={!menu.props.classifiers.has(menu.props.classifierName)}
          onClick={() => menu.viewer.predict.onPredict()}
      >
        Go...
      </Button>
      </ButtonGroup> 
      </div>
    );
}

PredictMode.prototype.predictButtonActive = truth;

const DefaultMode = () => new DisabledMode();

export default DefaultMode;
