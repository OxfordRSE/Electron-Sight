import React from 'react';
let slic = require('../../addons/slic/slic');
const electron = window.require('electron');
import OpenSeadragon from 'openseadragon';
import TileOverlay from '../util/TileOverlay';
import {create_tile, load_and_process_tile } from './openseadragon.js';


export function predictAnnotation(openseadragon, classifier, annotation) {
  console.log(`predict using ${classifier.get('name')} on ${annotation.get('name')}`);
  const tile_source = openseadragon.world.getItemAt(0).source;
  const tiled_image = openseadragon.world.getItemAt(0);
  // get minimum bounding rectangle around polygon
  const reduce_init = { min: new OpenSeadragon.Point(Infinity,Infinity),
                        max: new OpenSeadragon.Point(-Infinity,-Infinity) }; 
  const limits = annotation.get('polygon').reduce((limits, point) => {
    if (point.x > limits.max.x) {
      limits.max.x = point.x;
    }
    if (point.x < limits.min.x) {
      limits.min.x = point.x;
    }
    if (point.y > limits.max.y) {
      limits.max.x = point.x;
    }
    if (point.y < limits.min.y) {
      limits.min.x = point.x;
    }
    return limits;
  }, reduce_init );

  let result = Map();
  let process_and_store_tile = (tile, img_data) => { 
    tile_overlay = predictTile(tile, img_data, classifier);
    return result.set(tile_overlay.id, tile_overlay);
  };

  // loop over all tiles in that bounding rectangle and see which ones are in the
  // polygon
  const level = classifier.get('zoom');
  const min_tile = tile_source.getTileAtPoint(level, min);
  const max_tile = tile_source.getTileAtPoint(level, max);
  for (let x=min_tile.x; x<=max_tile.x; x++) {
    for (let y=min_tile.y; y<=max_tile.y; y++) {
      const tile = create_tile(x, y, level, tile_source, openseadragon.drawer.context);
      if (inPolygon(this.state.polygon, tile.bounds)) {
        load_and_process_tile(tiled_image, tile, process_and_store_tile);
      }
    }
  }
  return result;
}

// called when a new tile is loaded
function predictTile(tile, img_data, classifier) {
    // SLIC the image data
    const superpixel_size = classifier.get('superpixel_size');
    const [
        outlabels, outLABMeanintensities,
        outPixelCounts, outseedsXY,
        outLABVariances, outCollectedFeatures
      ] = slic.slic(img_data.data, img_data.width, img_data.height, superpixel_size);

    var tile_overlay = new TileOverlay(tile, outlabels, outCollectedFeatures);

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
    tile_overlay.redraw();
    return tile_overlay;
  }

