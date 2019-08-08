import OpenSeadragon from 'openseadragon';
import React from 'react';
const electron = window.require('electron');

class Viewer extends React.Component {
  constructor(props){
      super(props)
      this.state = {openseadragon: null, brightness: 1, contrast: 1}
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
  getStyle(brightness, contrast) {
       return ("brightness(" + +brightness +
              ") contrast(" + +contrast + ")");
  }

  render() {
    const size = electron.remote.getCurrentWindow().getBounds();
    let filterString = this.getStyle(this.state.brightness, this.state.contrast);
    const style = {
      width: size.width,
      height: size.height,
      filter: filterString
    };
    return (<div id="Viewer" style={style}></div>);
  }
}


export default Viewer;
