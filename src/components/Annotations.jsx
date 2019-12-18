import React from 'react';
const electron = window.require('electron');
import OpenSeadragon from 'openseadragon';

class Annotations extends React.Component {
  constructor(props) {
    super(props)
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

  render() {
    const polygon = this.props.annotations.current.polygon;
    const openseadragon = this.props.openseadragon;
    const size = electron.remote.getCurrentWindow().getBounds();

    // get list of annotations for UI
    let annotations_list = []
    for (const [name, value] of this.props.annoations.created) {
      const label = `${name}`;
      annotations_list.push(<Radio label={label} value={name} key={name} />);
    }

    // get annotaion overlay 
    let annotation_overlay = []
    for (const [name, value] of this.props.annotaions.created) {
      let path_str = '';
      const pixel_points = value.polygon.map(p => openseadragon.viewport
        .imageToWindowCoordinates(p));
      const first_pt = pixel_points[0];
      if (polygon.length > 0) {
        const path_array = pixel_points.map(p => `L ${p.x} ${p.y}`);
        path_array[0] = `M ${first_pt.x} ${first_pt.y}`;
        path_str = path_array.join(' ');
        annotation_overlay.push(
          <circle cx={first_pt.x} cy={first_pt.y} r={"5"}/>
          <path d={path_str} strokeWidth={"2"} stroke={"black"} fill={"none"}/>
          <path d={path_str.concat(" Z")} 
                     stroke={"none"} 
                     fill={"green"} 
                     fillOpacity={"0.1"}/>
        );
      }
    }

    const style = {
      position: 'absolute',
      display: 'block',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%'
    };
    return (
      <div>
      <div id="AnnotationsOverlay">
      <svg style={style} id="annotation">
        {annotation_overlay}
      </svg>
      </div>
      <Card id="AnnotationsList" interactive={true} elevation={Elevation.Two}>
        <H5>Annotations</H5>
		    <RadioGroup label=""
            onChange={this.setClassifier.bind(this)}
            selectedValue={this.state.classifier_active}
        >
        {annotations_list}
        </RadioGroup>
      </Card>
      </div>
    );

    )
  }
}


export default connect()(Annotations)

