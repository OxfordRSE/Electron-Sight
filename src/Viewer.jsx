import OpenSeadragon from 'openseadragon';
import React from 'react';
const electron = window.require('electron');

class Viewer extends React.Component {
  constructor(props){
      super(props)
      this.state = {openseadragon: null}
  }
  componentDidMount() {

    let viewer = OpenSeadragon({
      id: "Viewer",
      prefixUrl: "../node_modules/openseadragon/build/openseadragon/images/",
      showNavigationControl: false,
      showNavigator: true,
      navigatorPosition: "BOTTOM_RIGHT",
      autoResize: true,
      animationTime: 0.5,
      blendTime: 0.1,
      constrainDuringPan: true,
      maxZoomPixelRatio: 2,
      minZoomLevel: 1,
      visibilityRatio: 1,
      zoomPerScroll: 2
    });

    this.setState({openseadragon: viewer});
    this.props.onOpen(viewer);

    viewer.gestureSettingsByDeviceType("mouse").clickToZoom = false;
    
  }
  render() {
    const size = electron.remote.getCurrentWindow().getBounds();
    const style = {
      width: size.width,
      height: size.height,
    };
    return (<div id="Viewer" style={style}>
    </div>);
  }
}


export default Viewer;
