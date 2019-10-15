import React from 'react';
let slic = require('../addons/slic/slic');
const electron = window.require('electron');
import OpenSeadragon from 'openseadragon';
import { TileOverlay } from './Classifier';

class Predict extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      drawing: false,
      openseadragon: null,
      cached_tiles: {},
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
    const viewer = this.state.openseadragon;
    viewer.addHandler('canvas-click', this.onClick.bind(this));
    viewer.gestureSettingsByDeviceType("mouse").scrollToZoom = false;
  }

 endDrawing() {
    this.setState({drawing: false});
    const viewer = this.state.openseadragon;
    viewer.removeHandler('canvas-click', this.onClick.bind(this));
    viewer.gestureSettingsByDeviceType("mouse").scrollToZoom = true;
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


  onClick(data) {
    console.log('predict onClick');
    const openseadragon = this.state.openseadragon;
    const size = electron.remote.getCurrentWindow().getBounds();
    const viewport = this.state.openseadragon.viewport;
    const classifier = this.props.classifier;
    const tiled_image = openseadragon.world.getItemAt(0);
    const point = viewport.pointFromPixel(data.position);
    var found_tile = null;
    var pixel_in_tile = new OpenSeadragon.Point();
    let svm = classifier.state.classifiers[
      classifier.state.classifier_active].classifier;
 
    tiled_image.lastDrawn.forEach((tile) => {
        if (tile.bounds.containsPoint(point)) {
          found_tile = tile;
       }
    });
   const tile = found_tile;
   console.log('tile', tile);
   if (tile) {
        if(tile.cacheKey in this.state.cached_tiles) {
            var tile_overlay = this.state.cached_tiles[tile.cacheKey];
        } else {
            var rendered = tile.context2D || tile.cacheImageRecord.getRenderedContext();
            var img_data = rendered.getImageData(tile.sourceBounds.x, tile.sourceBounds
            .y, tile.sourceBounds.width, tile.sourceBounds.height);
            const [
                outlabels, outLABMeanintensities,
                outPixelCounts, outseedsXY,
                outLABVariances, outCollectedFeatures
              ] = slic.slic(img_data.data, img_data.width, img_data.height, this.state
                .superpixel_size);
            var tile_overlay = new TileOverlay(tile, outlabels, outCollectedFeatures);
            this.state.cached_tiles[tile.cacheKey] = tile_overlay;
        }
        var n_superpixels = Math.max(...tile_overlay.labels) + 1;
        console.log('n superpixels', n_superpixels);
        var features = [];
        var i;
        for(i = 0; i < n_superpixels; i++ ) {
            features.push(tile_overlay.generate_data(i));
        }
        var classification = svm.predict(features);
        console.log('max classification', Math.max(...classification));
        for(i = 0; i < n_superpixels; i++ ) {
            tile_overlay.add_classification(i, (classification[i] > 0 ? 1 : -1));
        }
        tile_overlay.redraw();
        console.log('predicted for tile');
     }
  }

  render() {
    const openseadragon = this.state.openseadragon;
    const size = electron.remote.getCurrentWindow().getBounds();
    const classifier = this.props.classifier;
    if (this.state.drawing && classifier &&
        classifier.state.classifier_active) {
        const viewport = this.state.openseadragon.viewport;
        const tiled_image = openseadragon.world.getItemAt(0);
        let zoom_classifier = classifier.state.classifiers[
            classifier.state.classifier_active].building_zoom;
        console.log('zoom level of selected classifier', zoom_classifier);
        viewport.zoomTo(viewport.imageToViewportZoom(
            tiled_image.source.getLevelScale(zoom_classifier)));
        openseadragon.forceRedraw();
        // iterate through tiles
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
