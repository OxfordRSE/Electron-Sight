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
      superpixel_size: 100,
      svm_cost: 0,
      svm_gamma: 0,
      classifier_name: "Classifier",
      openseadragon: null,
      selected_tiles: {},
      classifiers: {}
    };
    this.set_building_zoom= this.set_building_zoom.bind(this);
    this.set_classifier_name = this.set_classifier_name.bind(this);
    this.set_svm_cost = this.set_svm_cost.bind(this);
    this.set_svm_gamma = this.set_svm_gamma.bind(this);
    this.set_superpixel_size = this.set_superpixel_size.bind(this);
    this.update_superpixel_size = this.update_superpixel_size.bind(this);
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


  startBuilding() {
    const viewport = this.state.openseadragon.viewport;
    const tile_source = this.state.openseadragon.world.getItemAt(0).source;
    const viewer = this.state.openseadragon;
    let zoom = this.state.building_zoom;
    if (this.state.classifier_active) {
      updateClassifier(this.state.classifier_active);
      superpixel_size = this.state.classifiers[this.state.classifier_active].superpixel_size;
      zoom = this.state.classifiers[this.state.classifier_active].building_zoom;
    } else if (!zoom) {
      const max_zoom = tile_source.maxLevel;
      zoom = max_zoom;
      this.setState({
        building_zoom: max_zoom
      });
    }

    this.setState({
      building: true,
      selected_tiles: {},
    });

    viewport.zoomTo(viewport.imageToViewportZoom(tile_source.getLevelScale(zoom)));
    viewer.forceRedraw();

    viewer.gestureSettingsByDeviceType("mouse").scrollToZoom = false;

    viewer.addHandler('canvas-click', this.onClick.bind(this));
  }

  /// change the zoom level at which the classifier is build build. This resets the
  /// classification loop and erases all data
  set_building_zoom(event) {
    const zoom = event.currentTarget.value;
    console.log(`set building zoom ${zoom}`);
    this.setState({
      building_zoom: zoom 
    });
    this.endBuilding();
    this.startBuilding();
  }

  /// sets the target size of the superpixels. This resets the classification loop and
  /// erases all data
  update_superpixel_size(size) {
    this.endBuilding();
    this.startBuilding(this.state.building_zoom, size);
    this.set_superpixel_size(size);
  }

  set_superpixel_size(size) {
    this.setState({
      superpixel_size: size 
    });
  }

  set_svm_gamma(value) {
    this.setState({
      svm_gamma: value
    });
  }

  set_svm_cost(value) {
    this.setState({
      svm_cost: value
    });
  }

  set_classifier_name(name) {
    this.setState({
      classifier_name: name 
    });
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
  buildClassifier() {
    const name = this.state.classifier_name;
    const cost = Math.pow(10,this.state.svm_cost);
    const gamma = Math.pow(10,this.state.svm_gamma);
    console.log(`building classifier ${name}`);
    const svm = new SVM({
        kernel: SVM.KERNEL_TYPES.RBF, // The type of kernel I want to use
        type: SVM.SVM_TYPES.C_SVC,    // The type of SVM I want to run
        gamma: gamma,                     // RBF kernel gamma parameter
        cost: cost,                      // C_SVC cost parameter
        quiet: false
    });

    let features = [];
    let classification = [];
    for (const [id, tile] of Object.entries(this.state.selected_tiles)) {
      const [tile_features, tile_classification] = tile.get_train_data();
      features = features.concat(tile_features);
      classification = classification.concat(tile_classification);
    }

    // scale features between 0 and 1
    let min = new Array(features[0].length).fill(Infinity);
    let max = new Array(features[0].length).fill(-Infinity);
    for (let i = 0; i < features.length; i++) {
      for (let j = 0; j < features[i].length; j++) {
        if (features[i][j] < min[j]) {
          min[j] = features[i][j];
        }
        if (features[i][j] > max[j]) {
          max[j] = features[i][j];
        }
      }
    }

    for (let i = 0; i < features.length; i++) {
      for (let j = 0; j < features[i].length; j++) {
        features[i][j] = (features[i][j] - min[j]) / (max[j] - min[j]);
      }
    }

    svm.train(features, classification);  // train the model

    let classification_predicted = svm.predict(features);  // train the model

    this.setState(prevState => ({
      classifiers: Object.assign(prevState.classifiers, {[name]: {
          'classifier': svm, 
          'building_zoom': this.state.building_zoom, 
          'superpixel_size': this.state.superpixel_size,
          'selected_tiles': this.state.selected_tiles,
          'cost': cost,
          'gamma': gamma,
          'feature_min': min,
          'feature_max': max
      }})
    }));
  }

  onOpen(openseadragon) {
    this.setState({
      openseadragon: openseadragon,
    });
  }

  updateClassifier(selected_classifier) {
    // add overlay to openseadragon
    const selected_tiles = this.state.classifiers[selected_classifier].selected_tiles;
    const viewer = this.state.openseadragon;
    for (const [id, tile_overlay] of Object.entries(selected_tiles)) {
      viewer.addOverlay({
        element: tile_overlay.canvas,
        location: tile_overlay.tile.bounds
      });
    }

    this.setState({
      superpixel_size: this.state.classifiers[selected_classifier].superpixel_size,
      building_zoom: this.state.classifiers[selected_classifier].building_zoom,
      selected_tiles: selected_tiles 
    });
  }

  setClassifier(evt) {
    if (this.state.building) {
      updateClassifier(evt.currentTarget.value);
    }
    
    this.setState({
      classifier_active: evt.currentTarget.value,
    });
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

}


export default Classifier;
