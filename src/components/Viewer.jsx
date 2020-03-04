import OpenSeadragon from 'openseadragon';
import React from 'react';
const electron = window.require('electron');
import Annotations from '../containers/Annotations'
import Classifiers from '../containers/Classifiers'
import Predict from '../containers/Predict'
import Scalebar from './Scalebar'
const getStyle = (brightness, contrast) => ("brightness(" +
        +brightness + ") contrast(" + +contrast + ")");
import { ProgressBar } from '@blueprintjs/core';

class Viewer extends React.Component {
  constructor(props){
    super(props);
    this.state = {brightness: 1, contrast: 1};
    this.state = {
      loading: false,
      loading_progress: 0,
      viewport: {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }  
    };
  }

  componentDidMount() {
    this.openseadragon = OpenSeadragon({
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
    this.openseadragon.gestureSettingsByDeviceType("mouse").clickToZoom = false;
    this.openseadragon.addHandler('animation', (data) => {
      this.onResize(data.eventSource);
    });
    this.openseadragon.addHandler('canvas-click', this.props.onClick);
    this.openseadragon.addHandler('canvas-key', this.props.onKeyDown);
    this.openseadragon.addHandler('open', this.props.fileOpened);
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
    const size = electron.remote.getCurrentWindow().getBounds();
    let filterString = getStyle(this.props.brightness, this.props.contrast);
    const loading = this.state.loading;
    const style = {
      width: size.width,
      height: size.height,
      filter: filterString
    };
    return (
            <div>
            <div id="Viewer" style={style}/>
            { loading ? <ProgressBar intent="primary" value={this.state.loading_progress} /> : null }
            <Annotations 
              openseadragon={this.openseadragon}
              viewport={this.state.viewport}
              mode={this.props.mode}
              ref={annotations => {
                this.annotations= annotations;
              }}
            />
            <Predict
              openseadragon={this.openseadragon}
              viewport={this.state.viewport}
              mode={this.props.mode}
              ref={predict => {
                this.predict = predict;
              }}
            />
            <Classifiers
              openseadragon={this.openseadragon}
              viewport={this.state.viewport}
              mode={this.props.mode}
              ref={classifier => {
                this.classifier = classifier;
              }}
            />
            <Scalebar ref={scalebar => {this.scalebar = scalebar;}} />
            </div>
            );
  }
}


export default Viewer;
