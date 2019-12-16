import React from 'react';
const electron = window.require('electron');
import OpenSeadragon from 'openseadragon';

class Annotations extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      drawing: false,
      polygon: []
    };
  }

  startDrawing() {
    this.setState({
      drawing: true,
      polygon: []
    });
  }

  endDrawing() {
    this.setState({
      drawing: false
    });
  }

  onClick(data) {
    if (this.state.drawing && data.quick) {
      const point = data.position;
      const viewer = this.props.openseadragon;
      const imagePoint = viewer.viewport.windowToImageCoordinates(point);
      this.setState((state, props) => ({
        polygon: state.polygon.concat([imagePoint])
      }));
    }
  }


  render() {
    const polygon = this.state.polygon;
    const openseadragon = this.props.openseadragon;
    const size = electron.remote.getCurrentWindow().getBounds();

    let path_str = '';
    const pixel_points = polygon.map(p => openseadragon.viewport
      .imageToWindowCoordinates(p));
    const first_pt = pixel_points[0];
    if (polygon.length > 0) {
      const path_array = pixel_points.map(p => `L ${p.x} ${p.y}`);
      path_array[0] = `M ${first_pt.x} ${first_pt.y}`;
      path_str = path_array.join(' ');
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
      <div id="Annotations">
      <svg style={style} id="annotation">
        {polygon.length > 0 && (
          <circle cx={first_pt.x} cy={first_pt.y} r={"5"}/>
        )
        }
        {polygon.length > 0 &&
          <path d={path_str} strokeWidth={"2"} stroke={"black"} fill={"none"}/>
        }
        {polygon.length > 0 &&
          <path d={path_str.concat(" Z")} 
                   stroke={"none"} 
                   fill={"green"} 
                   fillOpacity={"0.1"}/>

        }
      </svg>
      </div>

    )
  }
}


export default Annotations;
