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

import slic from '../../addons/slic/slic';

const electron = window.require('electron');

import OpenSeadragon from 'openseadragon';
import TileOverlay from '../util/TileOverlay'


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
      selected_tiles: {},
      classifiers: {}
    };
    this.set_building_zoom= this.set_building_zoom.bind(this);
    this.update_superpixel_size = this.update_superpixel_size.bind(this);
    this.buildClassifier = this.buildClassifier.bind(this);
    this.startBuilding = this.startBuilding.bind(this);
    this.endBuilding = this.endBuilding.bind(this);
  }


  onClick(data) {
    if (this.state.building && data.quick) {
      const viewer = this.props.openseadragon;
      const viewport = this.props.openseadragon.viewport;

      const tile_source = viewer.world.getItemAt(0).source;
      const point = viewport.pointFromPixel(data.position);
      const zoom_level = this.props.building_zoom;
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
      console.log('tile in cache');
      var tile_overlay = this.state.selected_tiles[tile.cacheKey];

      // find superpixel user has selected
      const selected_superpixel = tile_overlay.labels[selected_tile_index];

      // update classification and redraw overlay
      tile_overlay.update_classification(selected_superpixel, classification);
      tile_overlay.redraw();

    } else {
      console.log('tile not in cache');
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0);
      var img_data = context.getImageData(0, 0, image.width, image.height);

      console.log(`slic with size ${this.props.superpixel_size}`);
      const [
        outlabels, outLABMeanintensities,
        outPixelCounts, outseedsXY,
        outLABVariances, outCollectedFeatures
      ] = slic.slic(img_data.data, img_data.width, img_data.height, this.props
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
    const viewport = this.props.openseadragon.viewport;
    const tile_source = this.props.openseadragon.world.getItemAt(0).source;
    const viewer = this.props.openseadragon;
    let zoom = this.props.building_zoom;
    if (this.state.classifier_active) {
      this.updateClassifier(this.state.classifier_active, true);
      zoom = this.state.classifiers[this.state.classifier_active].building_zoom;
    }

    this.setState({
      building: true,
    });

    viewport.zoomTo(viewport.imageToViewportZoom(tile_source.getLevelScale(zoom)));
    viewer.forceRedraw();
    viewer.gestureSettingsByDeviceType("mouse").scrollToZoom = false;
    return zoom;

  }

  clearBuilding() {
    const viewer = this.props.openseadragon;
    viewer.clearOverlays();
    this.setState({
      selected_tiles: {},
    });
  }

  /// change the zoom level at which the classifier is build build. This resets the
  /// classification loop and erases all data
  set_building_zoom(zoom) {
    console.log(`set building zoom ${zoom}`);
    const viewer = this.props.openseadragon;
    const viewport = this.props.openseadragon.viewport;
    const tile_source = this.props.openseadragon.world.getItemAt(0).source;
    viewport.zoomTo(viewport.imageToViewportZoom(tile_source.getLevelScale(zoom)));
    viewer.forceRedraw();
    this.clearBuilding();
  }

  /// sets the target size of the superpixels. This resets the classification loop and
  /// erases all data
  update_superpixel_size(size) {
    this.clearBuilding();
  }


  /// Turn off the classfication loop and remove the canvas-click callback. clear all
  /// overlays from openseadragon
  endBuilding() {
    const viewer = this.props.openseadragon;
    const viewport = this.props.openseadragon.viewport;
    viewer.gestureSettingsByDeviceType("mouse").scrollToZoom = true;
    viewer.clearOverlays();
    this.setState({
      building: false
    });
  }

  /// Build an SVM classifier with the current classification data and add it to
  /// this.state.classifiers
  /// Note: all classification data is kept so user can keep on selecting superpixels
  buildClassifier() {
    const name = this.props.classifier_name;
    const cost = Math.pow(10,this.props.svm_cost);
    const gamma = Math.pow(10,this.props.svm_gamma);
    console.log(`building classifier ${name} with cost: ${cost} and gamma ${gamma}`);
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

    // leave-one-out cross validation test
    const validation = svm.crossValidation(features, classification, classification.length);

    // Work out how many classifications were correct.
    let totalCorrect = 0;
    for( let i = 0; i < validation.length; i++) {
      if (validation[i] == classification[i]) {
        totalCorrect++;
      }
    }
    // Calculate the accuracy
    const accuracy = 100.0 * totalCorrect / validation.length;
    console.log(`Cross Validation Accuracy = ${accuracy}`);

    svm.train(features, classification);  // train the model

    var pclassification = svm.predict(features);

    console.log('finished training');

    let copy_selected_tiles = {}
    for (const [id, tile_overlay] of Object.entries(this.state.selected_tiles)) {
      copy_selected_tiles[id] = tile_overlay.copy();
    }
    this.setState(prevState => ({
      classifiers: Object.assign(prevState.classifiers, {[name]: {
          'classifier': svm, 
          'building_zoom': prevState.building_zoom, 
          'superpixel_size': prevState.superpixel_size,
          'selected_tiles': copy_selected_tiles,
          'cost': prevState.svm_cost,
          'gamma': prevState.svm_gamma,
          'feature_min': min,
          'feature_max': max,
          'validation_score': accuracy
      }}),
      classifier_active: prevState.classifiers.length,
    }));
    
  }

  onOpen(openseadragon) {
    this.setState({
      openseadragon: openseadragon,
    });
  }

  updateClassifier(selected_classifier, update_overlays) {
    // add overlay to openseadragon
    const classifier = this.state.classifiers[selected_classifier];
    const viewer = this.props.openseadragon;
    if (update_overlays) {
      viewer.clearOverlays();
      for (const [id, tile_overlay] of Object.entries(classifier.selected_tiles)) {
        viewer.addOverlay({
          element: tile_overlay.canvas,
          location: tile_overlay.tile.bounds
        });
      }
    }

    let copy_selected_tiles = {}
    for (const [id, tile_overlay] of Object.entries(classifier.selected_tiles)) {
      copy_selected_tiles[id] = tile_overlay.copy();
    }

    this.setState({
      superpixel_size: classifier.superpixel_size,
      building_zoom: classifier.building_zoom,
      selected_tiles: copy_selected_tiles,
      svm_cost: classifier.cost,
      svm_gamma: classifier.gamma
    });
  }

  setClassifier(evt) {
    this.updateClassifier(evt.currentTarget.value, this.state.building);
    
    this.setState({
      classifier_active: evt.currentTarget.value,
    });
  }


  render() {
    let classifiers = []
    for (const [name, svm] of Object.entries(this.state.classifiers)) {
      const name_and_score = `${name} (LOOCV: ${svm.validation_score}%)`;
      classifiers.push(<Radio label={name_and_score} value={name} key={name} />);
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
