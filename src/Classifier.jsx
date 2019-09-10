import React from 'react';
import palette from 'google-palette';
import _ from 'underscore';
import Color from 'color';
import SVM from 'libsvm-js/asm';
import OpenSeadragon from 'openseadragon';

import {
  H5,
  Card,
  Elevation,
  Callout,
} from "@blueprintjs/core";

import TileOverlay from './TileOverlay.js'
import slic from '../addons/slic/slic';


const electron = window.require('electron');


/// Handles the creation of classifiers by the user. 
///
/// Currently just renders a list of created classifiers to the screen
/// App is responsible for calling the startBuilding funtion, which adds a callback to
/// the user clicking on a superpixel in the image. From then on the user keeps clicking
/// or shift-clicking on the image to select superpixels that are classified as positive
/// or negative. This data is stored in a list of TileOverlay objects, which keep the
/// classification data as well as draw the overlays that are given to openseadragon.
/// 
/// This classification loop can be concluded using stopBuilding or buildClassifier
class Classifier extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      building: false,
      building_zoom: 1,
      superpixel_size: 30,
      openseadragon: null,
      selected_tiles: {},
      classifiers: {}
    };
  }

  /// start building up a new classifier
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

  /// change the zoom level at which the classifier is build build. This resets the
  /// classification loop and erases all data
  setZoomLevel(event) {
    const zoom = event.currentTarget.value;
    this.endBuilding();
    this.startBuilding(zoom, this.state.superpixel_size);
  }

  /// sets the target size of the superpixels. This resets the classification loop and
  /// erases all data
  setSuperpixelSize(size) {
    this.endBuilding();
    this.startBuilding(this.state.building_zoom, size);
  }

  /// Turn off the classfication loop and remove the canvas-click callback. clear all
  /// overlays from openseadragon
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

  /// Build an SVM classifier with the current classification data and add it to
  /// this.state.classifiers
  /// Note: all classification data is kept so user can keep on selecting superpixels
  buildClassifier(name) {
    console.log(`building classifier ${name}`);
    const svm = new SVM({
      kernel: SVM.KERNEL_TYPES.RBF, // The type of kernel I want to use
      type: SVM.SVM_TYPES.C_SVC, // The type of SVM I want to run
      gamma: 1, // RBF kernel gamma parameter
      cost: 1 // C_SVC cost parameter
    });

    let features = [];
    let classification = [];
    for (const [id, tile] of Object.entries(this.state.selected_tiles)) {
      const [tile_features, tile_classification] = tile.get_train_data();
      features = features.concat(tile_features);
      classification = classification.concat(tile_classification);
    }
    svm.train(features, classification); // train the model
    this.setState(prevState => ({
      classifiers: Object.assign(prevState.classifiers, {
        [name]: svm
      })
    }));
  }

  /// render a list of constructed classifiers
  render() {
    let classifiers = []
    for (const [name, svm] of Object.entries(this.state.classifiers)) {
      classifiers.push(<p>{name}</p>);
    }
    return (
      <Card id="Classifier" interactive={true} elevation={Elevation.Two}>
        <H5>Classifiers</H5>
        {classifiers}
      </Card>
    );
  }

  onOpen(openseadragon) {
    this.setState({
      openseadragon: openseadragon
    });
  }

  /// logic to run when user clicks on the image during classification loop
  onClick(data) {
    const viewer = this.state.openseadragon;
    const viewport = this.state.openseadragon.viewport;
    const zoom_level = viewport.getZoom();
    const tiled_image = viewer.world.getItemAt(0);
    const tile_source = viewer.world.getItemAt(0).source;
    var found_tile = null;
    var pixel_in_tile = new OpenSeadragon.Point();
    const point = viewport.pointFromPixel(data.position);

    // find the tile that the user clicked on in openseadragon. make sure that its level
    // matches the zoom level chosen
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

    // TODO: sometimes openseadragon has not loaded the tile at the expected zoom
    // level. Not sure why this is happening
    if (tile) {

      // the index of the pixel that the user clicked on
      const selected_tile_index = pixel_in_tile.y * tile.sourceBounds.width +
        pixel_in_tile.x;

      // if shift is held, then this indicates a "negative" classification
      const classification = data.shift ? -1 : 1;

      // check if the user has selected a superpixel in this tile previously
      if (tile.cacheKey in this.state.selected_tiles) {
        // get the pre-existing TileOverlay
        var tile_overlay = this.state.selected_tiles[tile.cacheKey];

        // find superpixel user has selected
        const selected_superpixel = tile_overlay.labels[selected_tile_index];

        // update classification and redraw overlay
        tile_overlay.update_classification(selected_superpixel, classification);
        tile_overlay.redraw();

      } else {
        // need to create a new TileOverlay. Get the image data from openseadragon and
        // then run the superpixelation code over it
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

        // create new TileOverlay
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


export default Classifier;
