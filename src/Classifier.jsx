import React from 'react';
let slic = require('../addons/slic/slic');
let palette = require('google-palette');
let _ = require('underscore')
let Color = require('color');
let SVM = require('libsvm-js/asm');


import {
  H5,
  Card,
  Elevation,
  Callout,
} from "@blueprintjs/core";


const electron = window.require('electron');

import OpenSeadragon from 'openseadragon';

class TileOverlay {
  // tile: openseadragon Tile object
  // labels: TypedArray mapping pixels to superpixel number
  // features: 26*nsuperpixels array of features
  constructor(tile, labels, features) {
    this.id = tile.cacheKey;
    this.tile = tile;
    this.labels = new Int32Array(labels);
    this.nfeatures = 26;
    this.features = new Float64Array(features);
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext('2d');
    this.canvas.width = tile.sourceBounds.width;
    this.canvas.height = tile.sourceBounds.height;
    this.canvas.id = this.id;
    this.pixel_classification = new Int8Array(tile.sourceBounds.width * tile
      .sourceBounds.height);
    this.positive_superpixels = new Set();
    this.negative_superpixels = new Set();
  }

  update_classification(selected_superpixel, classification) {
    if (classification > 0) {
      if (selected_superpixel in this.positive_superpixels) {
        this.positive_superpixels.delete(selected_superpixel);
      } else {
        this.positive_superpixels.add(selected_superpixel);
      }
      this.negative_superpixels.delete(selected_superpixel);
    } else if (classification < 0) {
      if (selected_superpixel in this.negative_superpixels) {
        this.negative_superpixels.delete(selected_superpixel);
      } else {
        this.negative_superpixels.add(selected_superpixel);
      }
      this.positive_superpixels.delete(selected_superpixel);
    }
    for (let i = 0; i < this.pixel_classification.length; i++) {
      if (this.labels[i] == selected_superpixel) {
        this.pixel_classification[i] = this.pixel_classification[i] ==
          classification ? 0 : classification;
      }
    }
  }

  //var xor = [
  //    [[0, 0], 0],
  //    [[0, 1], 1],
  //    [[1, 0], 1],
  //    [[1, 1], 0]
  //];
  generate_train_data(chosen_superpixel, classification) {
    const features_index = this.nfeatures * chosen_superpixel;
    const features = Array.from(this.features.slice(features_index, features_index +
      this.nfeatures));
    return [features, classification];
  }

  get_train_data() {
    var features = [];
    var classification = [];
    for (let i of this.positive_superpixels) {
      const [new_features, new_classification] = this.generate_train_data(i, 1)
      features.push(new_features);
      classification.push(new_classification);
    }
    for (let i of this.negative_superpixels) {
      const [new_features, new_classification] = this.generate_train_data(i, 1)
      features.push(new_features);
      classification.push(new_classification);
    }
    return [features, classification];
  }

  redraw() {
    // default for createImageData is transparent black
    const imageData = this.context.createImageData(this.canvas.width, this.canvas
      .height);

    // Iterate through every pixel
    // pixel_classification is [1 = green, -1 = red, 0 = transparent]
    for (let i = 0; i < imageData.width * imageData.height; i++) {
      if (this.pixel_classification[i] > 0) {
        // green
        imageData.data[4 * i + 1] = 255;
        imageData.data[4 * i + 3] = 100;
      } else if (this.pixel_classification[i] < 0) {
        // red
        imageData.data[4 * i + 0] = 255;
        imageData.data[4 * i + 3] = 100;
      }
    }

    // Draw image data to the canvas
    this.context.putImageData(imageData, 0, 0);
  }
}


class Classifier extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      building: false,
      building_zoom: 1,
      superpixel_size: 30,
      openseadragon: null,
      selected_tiles: {},
      classifiers: []
    };
  }


  onClick(data) {
    if (this.state.building && data.quick) {
      const viewer = this.state.openseadragon;
      const viewport = this.state.openseadragon.viewport;
      const zoom_level = viewport.getZoom();
      const tiled_image = viewer.world.getItemAt(0);
      const tile_source = viewer.world.getItemAt(0).source;
      var found_tile = null;
      var pixel_in_tile = new OpenSeadragon.Point();
      const point = viewport.pointFromPixel(data.position);

      tiled_image.lastDrawn.forEach((tile) => {
        if (tile.level == this.state.building_zoom && tile.bounds.containsPoint(
            point)) {
          found_tile = tile;
          pixel_in_tile.x = Math.floor((point.x - tile.bounds.x) *
            tile.sourceBounds.width /
            tile.bounds.width);
          pixel_in_tile.y = Math.floor((point.y - tile.bounds.y) *
            tile.sourceBounds.height /
            tile.bounds.height);
        }
      });

      const tile = found_tile;

      if (tile) {
        const selected_tile_index = pixel_in_tile.y * tile.sourceBounds.width +
          pixel_in_tile.x;

        const classification = data.shift ? -1 : 1;
        if (tile.cacheKey in this.state.selected_tiles) {
          var tile_overlay = this.state.selected_tiles[tile.cacheKey];

          // find superpixel user has selected
          const selected_superpixel = tile_overlay.labels[selected_tile_index];

          // update classification and redraw overlay
          tile_overlay.update_classification(selected_superpixel, classification);
          tile_overlay.redraw();

        } else {
          var rendered = tile.context2D || tile.cacheImageRecord
            .getRenderedContext();
          var img_data = rendered.getImageData(tile.sourceBounds.x, tile
            .sourceBounds
            .y, tile.sourceBounds.width, tile.sourceBounds.height);

          const [
            outlabels, outLABMeanintensities,
            outPixelCounts, outseedsXY,
            outLABVariances, outCollectedFeatures
          ] = slic.slic(img_data.data, img_data.width, img_data.height, this.state
            .superpixel_size);

          // create overlay
          const tile_overlay = new TileOverlay(tile, outlabels,
            outCollectedFeatures);

          // find superpixel user has selected
          const selected_superpixel = outlabels[selected_tile_index];

          // update and redraw overlay
          tile_overlay.update_classification(selected_superpixel, classification);
          tile_overlay.redraw();

          // add overlay to openseadragon
          viewer.addOverlay({
            element: tile_overlay.canvas,
            location: tile.bounds
          });

          // add to set of selected tiles
          this.state.selected_tiles[tile_overlay.id] = tile_overlay;
        }
      }
    }
  }

  unLoadTile(data) {

    // clean up overlay
    viewer.removeOverlay(data.tile.cacheKey);
  }

  startBuilding(zoom, superpixel_size) {
    const viewer = this.state.openseadragon;
    const viewport = this.state.openseadragon.viewport;
    const tiled_image = this.state.openseadragon.world.getItemAt(0);

    const tile_source = this.state.openseadragon.world.getItemAt(0).source;
    const max_level = tile_source.maxLevel;
    const max_zoom = viewport.getMaxZoom();
    const min_zoom = viewport.getMinZoom();
    viewport.zoomTo(viewport.imageToViewportZoom(tile_source.getLevelScale(zoom)));
    viewer.gestureSettingsByDeviceType("mouse").scrollToZoom = false;

    viewer.addHandler('canvas-click', this.onClick.bind(this));

    this.setState({
      building: true,
      building_zoom: zoom,
      superpixel_size: superpixel_size,
      selected_tiles: {}
    });
  }

  setZoomLevel(event) {
    const zoom = event.currentTarget.value;
    this.endBuilding();
    this.startBuilding(zoom, this.state.superpixel_size);
  }

  setSuperpixelSize(size) {
    this.endBuilding();
    this.startBuilding(this.state.building_zoom, size);
  }

  endBuilding() {
    const viewer = this.state.openseadragon;
    const viewport = this.state.openseadragon.viewport;
    viewer.gestureSettingsByDeviceType("mouse").scrollToZoom = true;
    viewer.removeHandler('canvas-click', this.onClick.bind(this));
    viewer.clearOverlays();
    this.setState({
      building: false
    });
  }

  buildClassifier() {
    const svm = new SVM({
        kernel: SVM.KERNEL_TYPES.RBF, // The type of kernel I want to use
        type: SVM.SVM_TYPES.C_SVC,    // The type of SVM I want to run
        gamma: 1,                     // RBF kernel gamma parameter
        cost: 1                       // C_SVC cost parameter
    });

    let features = [];
    let classification = [];
    for (const [id, tile] of Object.entries(this.state.selected_tiles)) {
      const [tile_features, tile_classification] = tile.get_train_data();
      features = features.concat(tile_features);
      classification = classification.concat(tile_classification);
    }
    svm.train(features, classification);  // train the model
    const name = "ets";
    this.setState(prevState => ({
      classifiers: [...prevState.classifiers, {"name": name, "svm": svm}]
    }))
  }

  onOpen(openseadragon) {
    this.setState({
      openseadragon: openseadragon
    });
  }

  render() {
    let classifiers = []
    for (const c of this.state.classifiers) {
      classifiers.push(<p>{c.name}</p>);
    }
    return (
      <Card id="Classifier" interactive={true} elevation={Elevation.Two}>
        <H5>Classifiers</H5>
        {classifiers}
      </Card>
    );
  }
}


export default Classifier;
