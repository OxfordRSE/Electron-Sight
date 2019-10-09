import React from 'react';
let slic = require('../addons/slic/slic');
const electron = window.require('electron');
import OpenSeadragon from 'openseadragon';
import TileOverlay from './Classifier';

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
    const classifier = this.props.classifier;
    if (this.state.drawing && classifier &&
        classifier.state.classifier_active) {
        const tiled_image = openseadragon.world.getItemAt(0);
        let zoom_classifier = classifier.state.classifiers[
            classifier.state.classifier_active].building_zoom;
        let svm = classifier.state.classifiers[
            classifier.state.classifier_active].classifier;
        console.log('should be zooming to', zoom_classifier);
        openseadragon.viewport.zoomTo(zoom_classifier);
        openseadragon.forceRedraw();

        // iterate through tiles
        tiled_image.lastDrawn.forEach((tile) => {
            var rendered = tile.context2D || tile.cacheImageRecord.getRenderedContext();
            var img_data = rendered.getImageData(tile.sourceBounds.x, tile.sourceBounds
            .y, tile.sourceBounds.width, tile.sourceBounds.height);
            const [
                outlabels, outLABMeanintensities,
                outPixelCounts, outseedsXY,
                outLABVariances, outCollectedFeatures
              ] = slic.slic(img_data.data, img_data.width, img_data.height, this.state
                .superpixel_size);
            const tile_overlay = new TileOverlay(tile, outlabels, outCollectedFeatures);
            const superpixels = new Set(tile_overlay.labels);
            var features = [];
            for(let i of superpixels) {
                features.push(tile_overlay.generate_data(i));
            }
            var classification = svm.predict(features);
            console.log(classification);
        });
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
