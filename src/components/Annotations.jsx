import React from 'react';
const electron = window.require('electron');
import OpenSeadragon from 'openseadragon';
import paper from 'paper';
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
    this.store = new Store({name: 'sight'});
    this.tmp_path = null;
    this.selected_index = null; 
    this.state = {}
  }

  componentDidMount() {
    paper.install(this);
    this.paper.setup('AnnotationCanvas');
    this.paper.project.options.handleSize = 8;
    this.paper.project.options.hitTolerance = 8;
    this.paper.project.currentStyle = {
      strokeColor: '#ff0000',
      strokeWidth: 2,
      strokeCap: 'round'
    }; 
  }

  onMouseDown(data) {
    let shift = data.originalEvent.shiftKey;
    let point = data.position;
    var hitResult = this.paper.project.hitTest(point, this.paper.hitOptions);
    if (!hitResult) {
      if (!shift) {
        const viewer = this.props.openseadragon;
        const imagePoint = viewer.viewport.windowToViewportCoordinates(point);
        this.props.addPoint(imagePoint);
        let path = this.paper.project.activeLayer.children[0];
        path.add(point);
        this.tmp_path = new this.paper.Path();
        this.selected_index = null;
      }
      return;
    }

    if (hitResult.type == 'segment') {
      const index = hitResult.segment.index;
      if (shift) {
        this.props.removePoint(index);
      } else {
        this.selected_index = index;
        hitResult.segment.selected = true;
        let path = this.paper.project.activeLayer.children[0];
        if (index == 0) {
          this.tmp_path = new this.paper.Path([
            path.segments[index],
            path.segments[index+1]
          ]);
        } else if (index == path.segments.length-1) {
          this.tmp_path = new this.paper.Path([
            path.segments[index-1],
            path.segments[index]
          ]);
        } else {
          this.tmp_path = new this.paper.Path([
            path.segments[index-1],
            path.segments[index],
            path.segments[index+1],
          ]);
        }
      }
    } else if (hitResult.type == 'stroke') {
      if (!shift) {
        const index = hitResult.location.index;
        this.selected_index = index + 1;
        let path = this.paper.project.activeLayer.children[0];
        path.insert(index + 1, point).selected = true;
        const viewer = this.props.openseadragon;
        const imagePoint = viewer.viewport.windowToViewportCoordinates(point);
        this.props.insertPoint(index + 1, imagePoint);
      }
    }
  }

  onMouseDrag(data) {
    let shift = data.originalEvent.shiftKey;
    if (shift) {
      return;
    }
    const delta = data.delta;
    const point = data.position;
    if (this.selected_index === null) {
      this.tmp_path.add(point);
    } else {
      if (this.selected_index == 0) {
        this.tmp_path.segments[0].point = point;
      } else {
        this.tmp_path.segments[1].point = point;
      }
    }
    data.preventDefaultAction = true;
    this.paper.view.draw();
  }

  onMouseUp(data) {
    let shift = data.originalEvent.shiftKey;
    if (shift) {
      return;
    }
    const point = data.position;
    const viewer = this.props.openseadragon;
    if (this.selected_index === null) {
      this.tmp_path.simplify(10);
      this.tmp_path.segments.map((s) => { 
        const p = new OpenSeadragon.Point(s.point.x, s.point.y);
        const imagePoint = viewer.viewport.windowToViewportCoordinates(p);
        this.props.addPoint(imagePoint); 
      });
    } else {
      const imagePoint = viewer.viewport.windowToViewportCoordinates(point);
      this.props.updatePoint(this.selected_index, imagePoint); 
    }
    this.tmp_path.remove();
    this.selected_index = null;
  }

  setAnnotation(evt) {
    const name = evt.currentTarget.value;
    this.props.setCurrentAnnotation(name);
    this.setState({
      annotation_active: name,
    });
  }

  clearAnnotation() {
      this.props.clearAnnotation();
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

  deleteSelectedAnnotation() {
    const selected_name = this.state.annotation_active;
    if (this.props.annotations.get('created').has(selected_name)) {
      this.props.deleteAnnotation(selected_name);
      this.props.saveAnnotationsToStore(this.props.filename);
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

    // render created annotations
    const annotation_overlay = this.props.annotations.get("created").map((value, key) => {
      return this.annotationToReact({name: key, value: value});
    }).toList();


    // for the current annotation we will use paperjs for rendering so we can do hit
    // detection (see mouse click handlers above)
    if (this.paper) {
      let path = null;
      if (this.paper.project.activeLayer.hasChildren()) {
        path = this.paper.project.activeLayer.children[0];
        path.removeSegments();
      } else {
        path = new this.paper.Path();
        path.selected = true;
        path.strokeWidth = 4;
        path.dashArray = [10, 12];
      }
      const current_polygon = this.props.annotations.getIn(['current', 'polygon']);
      const pixel_points = current_polygon.map(p => this.props.openseadragon.viewport
      .viewportToWindowCoordinates(p)).toJS();
      if (pixel_points.size > 0) {
        path.moveTo(new this.paper.Point(pixel_points[0].x, pixel_points[0].y));
      }
      pixel_points.map((v, k) => {
        path.lineTo(new this.paper.Point(v.x, v.y));
      });
      const size = electron.remote.getCurrentWindow().getBounds();

      this.paper.view.draw();
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
      <div >
      <div id="AnnotationsOverlay">
      <svg style={style} id="AnnotationSVG">
        {annotation_overlay}
      </svg>
	    <canvas id="AnnotationCanvas" resize="true"></canvas>
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
                this.deleteSelectedAnnotation();
              }}
              disabled={
                !this.props.annotations.get('created').has(
                  this.state.annotation_active
                )
              }
          >
          Delete Selected 
          </Button>
       </ButtonGroup>

      </Card>
      </div>
    );
  }
}

export default Annotations;
