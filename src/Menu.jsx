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
  BUILD_CLASSIFIER: 3
};

class Menu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: Modes.DISABLED,
      superpixel_size: 100,
      brightness_active: false,
      contrast_active: false,
      classifier_name: "Classifier",
      brightness: 1,
      contrast: 1
    };
  }

  openFile(nodeData: ITreeNode, _nodePath: number[], e: React.MouseEvent <
    HTMLElement > ) {
    this.props.openseadragon.open('file://' + nodeData.path)
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
      const tile_source = this.props.openseadragon.world.getItemAt(0).source;
      const max_zoom = tile_source.maxLevel;
      this.props.classifier.startBuilding(max_zoom, this.state.superpixel_size);
      this.setState({
        mode: Modes.BUILD_CLASSIFIER
      });
    }
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
                onChange={this.props.classifier.setZoomLevel.bind(this.props.classifier)}
                //value={this.props.classifier.state.zoom_level}
            />
        </FormGroup>
        
        <FormGroup
            label="Superpixel size"
            labelFor="superpixel-size"
        >
          <Slider min={10} max={500} stepSize={10} labelStepSize = {490}
                  onRelease={this.props.classifier.setSuperpixelSize.bind(this.props.classifier)}
                  onChange={this.changeHandler("superpixel_size")}
                  value={this.state.superpixel_size} 
          />
        </FormGroup>
        <FormGroup
            label="Name"
            labelFor="classifier-name"
        >
          <InputGroup id="classifier-name" placeholder={this.state.classifier_name}
                  onChange={this.inputGroupChangeHandler("classifier_name")}         
          />
        </FormGroup>
        <Button 
            fill={false}
            onClick={this.buildClassifier.bind(this)}
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
                onChange={this.changeHandler("brightness")}
                value={this.state.brightness} />
    );

    let contrast = (
      <Button icon="contrast" active={this.state.contrast_active}
              disabled = {this.state.mode == Modes.DISABLED}
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
