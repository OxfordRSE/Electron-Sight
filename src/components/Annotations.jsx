import React from 'react';
const electron = window.require('electron');
import OpenSeadragon from 'openseadragon';
import {
  H5,
  Card,
  Elevation,
  Callout,
  Radio,
  Divider,
  Button,
  ButtonGroup,
  RadioGroup,
} from "@blueprintjs/core";

import Store from 'electron-store'
const remote = require('electron').remote;
const app = remote.app;





class Annotations extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
    this.store = new Store({name: 'sight'});
  }

  onClick(data) {
    if (data.quick) {
      const point = data.position;
      const viewer = this.props.openseadragon;
      const imagePoint = viewer.viewport.windowToViewportCoordinates(point);
      console.log(imagePoint);
      this.props.addPoint(imagePoint);
    }
  }

  setAnnotation(evt) {
    const name = evt.currentTarget.value;
    this.props.setCurrentAnnotation(name);
    this.setState({
      annotation_active: name,
    });
  }

  saveAnnotationToJSON() {
    const selected_name = this.props.annotations.getIn(['current', 'name']);
    let selected_annotation = this.props.annotations.getIn(['created', selected_name]);
    console.log(`trying to save {name: ${selected_name}, annotation: ${selected_annotation}}`);
    if (selected_annotation) {
      console.log(`save current annotation in ${app.getPath('userData')}`);
      this.store.set('annotation', selected_annotation);
    }
  }

  loadAnnotationFromJSON() {
    let selected_annotation = this.store.get('annotation');
    if (selected_annotation) {
      const name = selected_annotation.name;
      const polygon = selected_annotation.polygon;
    
      console.log('load current annoation');
      this.props.updateName(name);
      polygon.map((point) => {
        this.props.addPoint(new OpenSeadragon.Point(point.x, point.y));
      });
      this.props.saveAnnotation();
    }
  }

  annotationToReact({name='', value={}, dashed=false, fill_color="green"}) {
    let path_str = '';
    const polygon = value.get('polygon');
    const pixel_points = polygon.map(p => this.props.openseadragon.viewport
      .viewportToWindowCoordinates(p)).toJS();
    const first_pt = pixel_points[0];
    if (polygon.size > 0) {
      const path_array = pixel_points.map(p => `L ${p.x} ${p.y}`);
      path_array[0] = `M ${first_pt.x} ${first_pt.y}`;
      path_str = path_array.join(' ');
      let text = <text key={`text_${name}`} x={first_pt.x+5} y={first_pt.y-5}>{name}</text>;
      let circle = <circle key={`circle_${name}`} cx={first_pt.x} cy={first_pt.y} r={"5"}/>;
      let line = dashed ? 
        <path key={`path_${name}`} d={path_str} strokeDasharray="5,5" strokeWidth={"2"} stroke={"black"} fill={"none"}/>:
        <path key={`path_${name}`} d={path_str} strokeWidth={"2"} stroke={"black"} fill={"none"}/>;
      let fill = <path key={`fill_${name}`} d={path_str.concat(" Z")} 
                   stroke={"none"} 
                   fill={fill_color} 
                   fillOpacity={"0.1"}/>;
      return [text, circle, line, fill];
    }
  }

  render() {
    
    const polygon = this.props.annotations.get("current").get("polygon");
    const openseadragon = this.props.openseadragon;
    const size = electron.remote.getCurrentWindow().getBounds();

    // get list of annotations for UI
    let annotations_list = 
      this.props.annotations.get("created").map((value, key) => {
        const label = `${key}`;
        return <Radio label={label} value={key} key={key} />;
    }).toList();

    // get annotaion overlay 
    const annotation_overlay = this.props.annotations.get("created").map((value, key) => {
      return this.annotationToReact({name: key, value: value});
    }).toList();

    // get current annotaion overlay 
    const annotation_current = this.annotationToReact({
      name: this.props.annotations.get('current').get('name'),
      value: this.props.annotations.get('current'),
      dashed: true,
      fill_color: "red"
    });

    const style = {
      position: 'absolute',
      display: 'block',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%'
    };

    console.log(`mode is ${this.props.mode.modeName}`);
    return (
      <div >
      <div id="AnnotationsOverlay">
      <svg style={style} id="annotation">
        {annotation_overlay}
        {annotation_current}
      </svg>
      </div>
      <Card id="AnnotationsList" interactive={true} elevation={Elevation.TWO}>
        <H5>Annotations</H5>
		    <RadioGroup label=""
            onChange={this.setAnnotation.bind(this)}
            selectedValue={this.state.annotation_active}
        >
        {annotations_list}
        </RadioGroup>
        <Divider/>
        <ButtonGroup fill={false} className="Buttons">
          <Button 
              onClick={() => {
                this.saveAnnotationToJSON();
              }}
          >
          Save
          </Button>
          <Button 
              onClick={() => {
                this.loadAnnotationFromJSON();
              }}
          >
          Load 
          </Button>
       </ButtonGroup>

      </Card>
      </div>
    );
  }
}

export default Annotations;