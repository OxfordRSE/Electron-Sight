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

const Modes = {
  DISABLED: 0,
  VIEW: 1,
  ANNOTATE: 2,
  BUILD_CLASSIFIER: 3,
  PREDICT: 4
};

class Menu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: Modes.DISABLED,
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

  openFile(nodeData: ITreeNode, _nodePath: number[], e: React.MouseEvent <
    HTMLElement > ) {
    const filename = nodeData.path;
    const extension = filename.split('.').pop();
    let success = false;
    if (extension == 'dzi') {
      console.log(`opening dzi file ${filename}`);
      this.props.openseadragon.open('file://' + nodeData.path)
    } else if (extension == 'ndpi') {
      console.log(`opening ndpi file ${filename}`);
    } else {
      console.log(`unknown extension ${extension} for file ${filename}`);
      return;
    }


    this.setState({
      mode: Modes.View
    });
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

  predict() {
    if (this.state.mode == Modes.PREDICT) {
      this.props.predict.endDrawing();
      this.setState({
        mode: Modes.VIEW
      });
    } else {
      if (this.state.mode == Modes.BUILD_CLASSIFIER) {
        this.props.classifier.endBuilding();
      }
      this.props.predict.startDrawing();
      this.setState({
        mode: Modes.PREDICT
      });
    }
  }

  run_predict() {
    this.props.predict.onPredict();
  }

  buildClick() {
    if (this.state.mode == Modes.BUILD_CLASSIFIER) {
      this.props.classifier.endBuilding();
      this.setState({
        mode: Modes.VIEW
      });
    } else if (this.state.mode != Modes.DISABLED) {
      if (this.state.mode == Modes.ANNOTATE) {
        this.props.annotations.endDrawing();
      }
      this.props.classifier.startBuilding();

      this.setState({
        mode: Modes.BUILD_CLASSIFIER,
        building_zoom: this.props.classifier.state.building_zoom,
        classifier_name: this.props.classifier.state.classifier_name,
        svm_cost: this.props.classifier.state.svm_cost,
        svm_gamma: this.props.classifier.state.svm_gamma,
        superpixel_size: this.props.classifier.state.superpixel_size
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
            active={this.state.mode == Modes.ANNOTATE} 
            onClick={this.animClick.bind(this)}
            disabled = {this.state.mode == Modes.DISABLED}
      >
        Annotation
      </Button>
    );

    var zoom_levels = [];
    if (this.state.mode != Modes.DISABLED) {
      if (this.props.openseadragon.world.getItemAt(0)) {
        const tile_source = this.props.openseadragon.world.getItemAt(0).source;
        const max_zoom = tile_source.maxLevel;
        const min_zoom = tile_source.minLevel;
        const number_of_zoom_levels = 5;
        const zoom_increment = Math.floor(max_zoom / number_of_zoom_levels);
        zoom_levels = [...Array(max_zoom - min_zoom).keys()].map(x => x + min_zoom +
          1).reverse();
      }
    }

    let classifier = (
      <Button 
            icon="build" 
            active={this.state.mode == Modes.BUILD_CLASSIFIER} 
            onClick={this.buildClick.bind(this)}
            disabled = {this.state.mode == Modes.DISABLED}
        >
          New classifier
        </Button>
    );

    let classifier_popdown;
    if (this.state.mode == Modes.BUILD_CLASSIFIER) {
      classifier_popdown = (
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
                onChange={this.classifierChangeHandler("building_zoom")}
                value={this.state.building_zoom}
            />
        </FormGroup>
        
        <FormGroup
            label="Superpixel size"
            labelFor="superpixel-size"
        >
          <Slider min={10} max={500} stepSize={10} labelStepSize = {100}
                  onRelease={this.props.classifier.update_superpixel_size}
                  onChange={this.classifierChangeHandler("superpixel_size")}
                  value={this.state.superpixel_size} 
          />
        </FormGroup>
        <FormGroup
            label="SVM cost (10^x)"
            labelFor="svm-cost"
        >
          <Slider id="svm-cost" min={-15} max={15} stepSize={1} labelStepSize = {2}
                  onChange={this.classifierChangeHandler("svm_cost")}
                  value={this.state.svm_cost} 
          />
        </FormGroup>
        <FormGroup
            label="SVM gamma (10^x)"
            labelFor="svm-gamma"
        >
          <Slider id="svm-gamma" min={-15} max={15} stepSize={1} labelStepSize = {2}
                  onChange={this.classifierChangeHandler("svm_gamma")}
                  value={this.state.svm_gamma} 
          />
        </FormGroup>
        <FormGroup
            label="Name"
            labelFor="classifier-name"
        >
          <InputGroup id="classifier-name" placeholder={this.props.classifier.classifier_name}
                  onChange={this.props.classifier.set_classifier_name}
          />
        </FormGroup>
        <Button 
            fill={false}
            onClick={this.props.classifier.buildClassifier}
        >
          Build new classifier...
        </Button>
        </div>
      );
    }

    let brightness = (
      <Button icon="flash" active={this.state.brightness_active}
              disabled = {this.state.mode == Modes.DISABLED}
              onClick={this.toggle("brightness")}>Brightness</Button>
    );

    let brightness_popdown = (
      <Slider className="MenuDropdown" min={0} max={2} stepSize={0.1}
                onChange={this.viewerChangeHandler("brightness")}
                value={this.state.brightness} />
    );

    let contrast = (
      <Button icon="contrast" active={this.state.contrast_active}
              disabled = {this.state.mode == Modes.DISABLED}
              onClick={this.toggle("contrast")}>Contrast</Button>
    );

    let predict = (
      <Button 
            icon="circle"
            active={this.state.mode == Modes.PREDICT}
            onClick={this.predict.bind(this)}
            disabled = {this.state.mode == Modes.DISABLED}
      >
        Predict
      </Button>
    );

    let predict_popdown;
    if (this.state.mode == Modes.PREDICT) {
      predict_popdown = (
        <div className="MenuDropdown" >
        <Callout
            intent="primary"
        >
        <p>Draw a region and predict within it</p>
        </Callout>
        <Button 
            fill={false}
            onClick={this.run_predict.bind(this)}
        >
          Go...
        </Button>
        </div>
      )
    }

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
