import React from 'react';
const { Map } = require("immutable");
let slic = require('../../addons/slic/slic');
const electron = window.require('electron');
import OpenSeadragon from 'openseadragon';
import TileOverlay from '../util/TileOverlay'
import TileCellData from '../util/TileCellData'
import { create_tile, load_and_process_tile } from '../util/openseadragon.js'
import { inPolygon } from '../util/geometry.js'

function predictAnnotation(openseadragon, classifier, annotation, saveTilePrediction, show_cells, show_superpixels) {
  const tile_source = openseadragon.world.getItemAt(0).source;
  const tiled_image = openseadragon.world.getItemAt(0);
  // get minimum bounding rectangle around polygon
  const reduce_init = { min: new OpenSeadragon.Point(Infinity,Infinity),
                        max: new OpenSeadragon.Point(-Infinity,-Infinity) }; 
  const polygon = annotation.get('polygon');
  const limits = polygon.reduce((limits, point) => {
    if (point.x > limits.max.x) {
      limits.max.x = point.x;
    }
    if (point.x < limits.min.x) {
      limits.min.x = point.x;
    }
    if (point.y > limits.max.y) {
      limits.max.y = point.y;
    }
    if (point.y < limits.min.y) {
      limits.min.y = point.y;
    }
    return limits;
  }, reduce_init );

  let result = Map();
  let process_and_store_tile = (tile, img_data) => { 
    // predict for tile
    const tile_overlay = predictTile(tile, img_data, classifier, annotation);

    // render and add overlay to openseadragon viewer
    if (show_superpixels) {
      tile_overlay.superpixel_classification.redraw();
      openseadragon.addOverlay({
        element: tile_overlay.superpixel_classification.canvas,
        location: tile_overlay.tile.bounds
      });
    }
    if (show_cells) {
      tile_overlay.redraw();
      openseadragon.addOverlay({
        element: tile_overlay.canvas,
        location: tile_overlay.tile.bounds
      });
    }
    

    // add tile_overlay to store
    saveTilePrediction(annotation.get('name'), tile_overlay);
  };

  // loop over all tiles in that bounding rectangle and see which ones are in the
  // polygon
  const level = classifier.get('zoom');
  const min_tile = tile_source.getTileAtPoint(level, limits.min);
  const max_tile = tile_source.getTileAtPoint(level, limits.max);
  for (let x=min_tile.x; x<=max_tile.x; x++) {
    for (let y=min_tile.y; y<=max_tile.y; y++) {
      const tile = create_tile(x, y, level, tile_source, openseadragon.drawer.context);
      // Shouldn't test if tile corners are in annotation; if an annotation intersects a tile but all corners are outside then we currently don't detect it
      if (inPolygon(polygon.toJS(), tile.bounds)) {
        load_and_process_tile(tiled_image, tile, process_and_store_tile);
      }
    }
  }
  return result;
}

// called when a new tile is loaded
function predictTile(tile, img_data, classifier, annotation) {
  // SLIC the image data
  const superpixel_size = classifier.get('superpixel_size');
  const [
      outlabels, outLABMeanintensities,
      outPixelCounts, outseedsXY,
      outLABVariances, outCollectedFeatures
    ] = slic.slic(img_data.data, img_data.width, img_data.height, superpixel_size);

  var tile_overlay = new TileOverlay(tile, outlabels, outCollectedFeatures, img_data);

  // generate features
  const min = classifier.get('feature_min');
  const max = classifier.get('feature_max');
  const n_superpixels = outPixelCounts.length
  const features = Array(n_superpixels).fill().map((_, idx) => {
    // scale features
    return tile_overlay.generate_data(idx).map(
                (x, idx) => ((x - min[idx]) / (max[idx] - min[idx]))
    );
  });

  // predict on features using svm
  classifier.get('svm').predict(features).map((x, idx) => {
    tile_overlay.add_classification(idx, (x > 0 ? 1 : -1));
  });
  return new TileCellData(tile_overlay,annotation);
}


class Predict extends React.Component {
  constructor(props) {
    super(props)
    this.state = {};
  }

  redrawOverlays(show_cells, show_superpixels) {

    // clear existing overlays
    this.props.openseadragon.clearOverlays();

    // redraw everything and add to openseadragon overlays
    this.props.results.map(annotation_result => {
      annotation_result.map((tile_overlay, id) => {
        if (show_superpixels) {
          tile_overlay.superpixel_classification.redraw();
          this.props.openseadragon.addOverlay({
            element: tile_overlay.superpixel_classification.canvas,
            location: tile_overlay.tile.bounds
          });
        }
        if (show_cells) {
          tile_overlay.redraw();
          this.props.openseadragon.addOverlay({
            element: tile_overlay.canvas,
            location: tile_overlay.tile.bounds
          });
        }
        
      });
    });
  }

  startPredict() {
    this.redrawOverlays(this.props.show_cells, this.props.show_superpixels);
  }

  endPredict() {
    this.props.openseadragon.clearOverlays();
  }

  onPredict() {
    this.props.openseadragon.clearOverlays();
    this.props.annotations.map(annotation => {
      predictAnnotation(
        this.props.openseadragon, 
        this.props.classifier, 
        annotation, 
        this.props.saveTilePrediction,
        this.props.show_cells,
        this.props.show_superpixels
      );
    });
  }


  render() {
    return null;
  }
}


export default Predict;
