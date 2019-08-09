import React from 'react';
let slic = require('../addons/slic/slic');
let palette = require('google-palette');
let _ = require('underscore')
let Color = require('color');

const electron = window.require('electron');

import OpenSeadragon from 'openseadragon';


function createTileOverlay(id, image, overlay) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.id = id;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(image);

  console.log(`creating an overlay (${imageData.width}x${imageData.height})`)
  var max = Math.max(...overlay)
  var min = Math.min(...overlay)
  var uniqueSuperPixels = new Set(overlay)
  console.log("superpixels", uniqueSuperPixels.size)
  console.log("maxOverlay", max)
  console.log("minOverlay", min)
  var colors = _.shuffle(palette('tol-dv', uniqueSuperPixels.size)).map(x => Color('#' +
    x))
  var superpixelsColorMap = new Map(Array.from(uniqueSuperPixels).map(function(e, i) {
    return [e, colors[i]];
  }));
  // Iterate through every pixel
  for (let i = 0; i < imageData.width * imageData.height; i++) {
    // Modify pixel data, convert to RGBA
    imageData.data[4 * i] = superpixelsColorMap.get(overlay[i]).red();
    imageData.data[4 * i + 1] = superpixelsColorMap.get(overlay[i]).green();
    imageData.data[4 * i + 2] = superpixelsColorMap.get(overlay[i]).blue();
    imageData.data[4 * i + 3] = 100; // A value
  }
  console.log("overlay", overlay)
  console.log(imageData.data)

  // Draw image data to the canvas
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

class Classifier extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      building: false,
      openseadragon: null,
      tiles: {},
    };
  }

  onClick(data) {
    if (this.state.building) {
      const viewer = this.state.openseadragon;
      const viewport = this.state.openseadragon.viewport;
      const zoom_level = viewport.getZoom();
      const tiled_image = viewer.world.getItemAt(0);
      const tile_source = viewer.world.getItemAt(0).source;
      var found_tile = null;
      const point = viewport.pointFromPixel(data.position);

      tiled_image.lastDrawn.forEach(function(tile) {
          if (tile.bounds.containsPoint(point)) {
              console.log('lastDrawn', tile);
              found_tile = tile;
          }
      });
      
      const tile = found_tile;
      console.log("tile at position " + data.position.toString() +
        " has cache key " + tile.cacheKey);

      if (tile.cacheKey in this.state.tiles) {
        // switch superpixel chosen
      } else {
        var rendered = tile.context2D || tile.cacheImageRecord.getRenderedContext();
        var img_data = rendered.getImageData(tile.sourceBounds.x, tile.sourceBounds.y, tile.sourceBounds.width, tile.sourceBounds.height);

        const [
          outlabels, outLABMeanintensities,
          outPixelCounts, outseedsXY,
          outLABVariances, outCollectedFeatures
        ] = slic.slic(img_data.data, img_data.width, img_data.height)

        // create overlay
        viewer.addOverlay({
          element: createTileOverlay(tile.cacheKey, img_data, outlabels),
          location: tile.bounds
        });

        this.state.tiles[tile.cacheKey] = tile
      }
    }
  }

  unLoadTile(data) {

    // clean up overlay
    viewer.removeOverlay(data.tile.cacheKey);
  }

  startBuilding() {
    const viewer = this.state.openseadragon;
    const viewport = this.state.openseadragon.viewport;
    const max_zoom = viewport.getMaxZoom();
    viewport.zoomTo(max_zoom);
    viewer.gestureSettingsByDeviceType("mouse").scrollToZoom = false;

    viewer.addHandler('canvas-click', this.onClick.bind(this));

    console.log('Classifier start:' + viewport.getZoom().toString());
    this.setState({
      building: true,
      tiles: {}
    });
  }

  endBuilding() {
    const viewer = this.state.openseadragon;
    const viewport = this.state.openseadragon.viewport;
    console.log('Classifier end:' + viewport.getZoom().toString());
    viewer.gestureSettingsByDeviceType("mouse").scrollToZoom = true;
    viewer.removeHandler('canvas-click', this.onClick(data).bind(this));
    viewer.clearOverlays();
    this.setState({
      building: false
    });
  }

  onOpen(openseadragon) {
    this.setState({
      openseadragon: openseadragon
    });


  }

  render() {
    const openseadragon = this.state.openseadragon;
    return (
      <div id="Classifier">
      
      </div>
    )
  }
}


export default Classifier;
