import React from 'react';

import palette from 'google-palette';
import _ from 'underscore';
import Color from 'color';
import SVM from 'libsvm-js/asm';

import {
  H5,
  Card,
  Elevation,
  Callout,
  Button,
  Radio,
  RadioGroup,
} from "@blueprintjs/core";

import slic from '../addons/slic/slic';

const electron = window.require('electron');

import OpenSeadragon from 'openseadragon';
import TileOverlay from './TileOverlay'


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


  onClick(data) {
    if (this.state.building && data.quick) {
      const viewer = this.state.openseadragon;
      const viewport = this.state.openseadragon.viewport;

      const tile_source = viewer.world.getItemAt(0).source;
      const point = viewport.pointFromPixel(data.position);
      const zoom_level = this.state.building_zoom;
      const click_location = this.click_location_in_tile(tile_source, point, viewer.drawer.context, zoom_level);

      if (click_location.tile.cacheKey in this.state.selected_tiles) {
        var tile_overlay = this.state.selected_tiles[click_location.tile.cacheKey];

        // find superpixel user has selected
        const selected_tile_index = click_location.pixel.y * click_location.tile.sourceBounds.width +
      click_location.pixel.x;


        const selected_superpixel = tile_overlay.labels[selected_tile_index];

        // update classification and redraw overlay
        const classification = data.shift ? -1 : 1;
        tile_overlay.update_classification(selected_superpixel, classification);
        tile_overlay.redraw();
      } else {
        const tiled_image = viewer.world.getItemAt(0);
        this.load_and_process_tile(tiled_image, viewer, click_location.tile, data, click_location.pixel);
      }
    }
  }


  click_location_in_tile(tile_source, point, context, zoom_level) {
    // we have to ask the tile source for all the info, then build the tile ourselves. Boo!
    const tile_vector = tile_source.getTileAtPoint(zoom_level, point);
    const tile_url = tile_source.getTileUrl(zoom_level, tile_vector.x, tile_vector.y);
    const tile_bounds = tile_source.getTileBounds(zoom_level, tile_vector.x, tile_vector.y, false);
    const tile_exists = tile_source.tileExists(zoom_level, tile_vector.x, tile_vector.y);
    const source_bounds = tile_source.getTileBounds(zoom_level, tile_vector.x, tile_vector.y, true);
    const pixel_in_tile = new OpenSeadragon.Point();
    pixel_in_tile.x = Math.floor((point.x - tile_bounds.x) *
      source_bounds.width /
      tile_bounds.width);
    pixel_in_tile.y = Math.floor((point.y - tile_bounds.y) *
      source_bounds.height /
      tile_bounds.height);
    return {
      tile: new OpenSeadragon.Tile(zoom_level, tile_vector.x, tile_vector.y, tile_bounds, tile_exists, tile_url, context, false, null, source_bounds),
      pixel: pixel_in_tile,
    };
  }

  // uses OpenSeadragon's image loader to load up the tile, calls 
  // this.on_tile_load once the tile is loaded
  load_and_process_tile(tiledImage, viewer, tile, data, pixel) {
    tile.loading = true;
    tiledImage._imageLoader.addJob({
      src: tile.url,
      loadWithAjax: tile.loadWithAjax,
      ajaxHeaders: tile.ajaxHeaders,
      crossOriginPolicy: tiledImage.crossOriginPolicy,
      ajaxWithCredentials: tiledImage.ajaxWithCredentials,
      callback: (image, errorMsg, tileRequest) => {
        this.on_tile_load(tiledImage, viewer, tile, image, errorMsg, tileRequest, data, pixel);
      },
      abort: function() {
        tile.loading = false;
      }
    });
  }

  // called when a new tile is loaded. renders the image data to a new canvas to get the
  // raw data, then superpixelates the image and creates a new TileOverlay for that tile
  on_tile_load(tiledImage, viewer, tile, image, errorMsg, tileRequest, data, pixel_in_tile) {
    if (!image) {
      console.log("Tile %s failed to load: %s - error: %s", tile, tile.url,
        errorMsg);
      tile.loading = false;
      tile.exists = false;
      return;
    }
    console.log('tile loaded');

    const selected_tile_index = 
      pixel_in_tile.y * tile.sourceBounds.width + pixel_in_tile.x;

    const classification = data.shift ? -1 : 1;
    if (tile.cacheKey in this.state.selected_tiles) {
      var tile_overlay = this.state.selected_tiles[tile.cacheKey];

      // find superpixel user has selected
      const selected_superpixel = tile_overlay.labels[selected_tile_index];

      // update classification and redraw overlay
      tile_overlay.update_classification(selected_superpixel, classification);
      tile_overlay.redraw();

    } else {
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0);
      var img_data = context.getImageData(0, 0, image.width, image.height);

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
    viewer.forceRedraw();
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
    // not sure why we need a second startBuilding, but without this
    // the overlays do not appear until superpixel size is changed.
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
        type: SVM.SVM_TYPES.C_SVC,    // The type of SVM I want to run
        gamma: 1,                     // RBF kernel gamma parameter
        cost: 1,                      // C_SVC cost parameter
        quiet: false
    });

    let features = [];
    let classification = [];
    for (const [id, tile] of Object.entries(this.state.selected_tiles)) {
      const [tile_features, tile_classification] = tile.get_train_data();
      features = features.concat(tile_features);
      classification = classification.concat(tile_classification);
    }
    svm.train(features, classification);  // train the model

    this.setState(prevState => ({
      classifiers: Object.assign(prevState.classifiers, {[name]: {
          'classifier': svm, 'building_zoom': this.state.building_zoom}})
    }));
  }

  onOpen(openseadragon) {
    this.setState({
      openseadragon: openseadragon
    });
  }

  setClassifier(evt) {
    this.setState({classifier_active: evt.currentTarget.value});
  }


  render() {
    let classifiers = []
    for (const [name, svm] of Object.entries(this.state.classifiers)) {
      classifiers.push(<Radio label={name} value={name} key={name} />);
    }
    return (
      <Card id="Classifier" interactive={true} elevation={Elevation.Two}>
        <H5>Classifiers</H5>
		<RadioGroup label=""
            onChange={this.setClassifier.bind(this)}
            selectedValue={this.state.classifier_active}
        >
        {classifiers}
        </RadioGroup>
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
