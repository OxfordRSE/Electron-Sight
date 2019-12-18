import React from 'react';
const electron = window.require('electron');
import OpenSeadragon from 'openseadragon';
import {
  H5,
  Card,
  Elevation,
  Callout,
  Radio,
  RadioGroup,
} from "@blueprintjs/core";



class Annotations extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  onClick(data) {
    if (data.quick) {
      const point = data.position;
      const viewer = this.props.openseadragon;
      const imagePoint = viewer.viewport.windowToImageCoordinates(point);
      this.props.addPoint(imagePoint);
    }
  }

  createAnnotation() {
    this.props.createAnnotation(this.props.current.name);
  }

  setAnnotation(evt) {
    const name = evt.currentTarget.value;
    console.log(`selected annotation ${name}`);
    this.props.setCurrentAnnotation(name);
    this.setState({
      classifier_active: name,
    });
  }

  annotationToReact(value) {
    let path_str = '';
    const polygon = value.get('polygon');
    const pixel_points = polygon.map(p => this.props.openseadragon.viewport
      .imageToWindowCoordinates(p)).toJS();
    const first_pt = pixel_points[0];
    if (polygon.size > 0) {
      const path_array = pixel_points.map(p => `L ${p.x} ${p.y}`);
      path_array[0] = `M ${first_pt.x} ${first_pt.y}`;
      path_str = path_array.join(' ');
      return (
        <div>
        <circle cx={first_pt.x} cy={first_pt.y} r={"5"}/>
        <path d={path_str} strokeWidth={"2"} stroke={"black"} fill={"none"}/>
        <path d={path_str.concat(" Z")} 
                   stroke={"none"} 
                   fill={"green"} 
                   fillOpacity={"0.1"}/>
        </div>
      );
    }
  }

  render() {
    const polygon = this.props.annotations.get("current").get("polygon");
    const openseadragon = this.props.openseadragon;
    const size = electron.remote.getCurrentWindow().getBounds();

    // get list of annotations for UI
    let annotations_list = 
      this.props.annotations.get("created").map((key, value) => {
        const label = `${name}`;
        return <Radio label={label} value={name} key={name} />;
    }).toList();

    // get annotaion overlay 
    const annotation_overlay = this.props.annotations.get("created").map((key, value) => {
      return this.annotationToReact(value);
    }).toList();

    // get annotaion overlay 
    const annotation_current = this.annotationToReact(this.props.annotations.get('current'));

    const style = {
      position: 'absolute',
      display: 'block',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%'
    };
    return (
      <div >
      <div id="AnnotationsOverlay">
      <svg style={style} id="annotation">
        {annotation_overlay}
        {annotation_current}
      </svg>
      </div>
      <Card id="AnnotationsList" interactive={true} elevation={Elevation.Two}>
        <H5>Annotations</H5>
		    <RadioGroup label=""
            onChange={this.setAnnotation.bind(this)}
            selectedValue={this.state.annotation_active}
        >
        {annotations_list}
        </RadioGroup>
      </Card>
      </div>
    );
  }
}

export default Annotations;
