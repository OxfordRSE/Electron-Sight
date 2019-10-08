import React from 'react';
const electron = window.require('electron');
import OpenSeadragon from 'openseadragon';

class Predict extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      drawing: false,
      openseadragon: null,
      viewport: {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }
    };
  }

  startDrawing() {
    this.setState({drawing: true, polygon: []});
  }

 endDrawing() {
    this.setState({drawing: false});
  }

  onOpen(openseadragon) {
    this.setState({
      openseadragon: openseadragon
    });
    openseadragon.addHandler('animation', (data) => {
      this.onResize(data.eventSource);
    });

  }

  onResize(openseadragon) {
    const bounds = openseadragon.viewport.getHomeBounds();
    const bounds_pixel = openseadragon.viewport.viewportToViewerElementRectangle(
      bounds);
    this.setState({
      viewport: bounds_pixel
    });
  }


  render() {
    const openseadragon = this.state.openseadragon;
    const size = electron.remote.getCurrentWindow().getBounds();
    const classifier = this.props.classifier
    if (this.state.drawing && classifier &&
        classifier.state.classifier_active) {
        let zoom_classifier = classifier.state.classifiers[
            classifier.state.classifier_active].building_zoom;
        console.log('should be zooming to', zoom_classifier);
        openseadragon.viewport.zoomTo(zoom_classifier);
        openseadragon.forceRedraw();
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
      <div id="Predict">
      </div>

    )
  }
}


export default Predict;
