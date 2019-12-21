import React from 'react';
let slic = require('../../addons/slic/slic');
const electron = window.require('electron');
import OpenSeadragon from 'openseadragon';
import TileOverlay from '../util/TileOverlay'
import predictAnnotation from '../util/predict.js'

class Predict extends React.Component {
  constructor(props) {
    super(props)
    this.state = {};
  }

  startPredict() {
    this.props.results.map(annotation_result => {
      annotation_result.map((tile_overlay, id) => {
        this.props.openseadragon.addOverlay({
          element: tile_overlay.canvas,
          location: tile_overlay.tile.bounds
        });
      });
    });
  }

  endPredict() {
    this.props.openseadragon.clearOverlays();
  }

  onPredict() {
    console.log('called onPredict');
    this.props.openseadragon.clearOverlays();
    const results = this.props.annotations.map(annotation => {
      const result = predictAnnotation(this.props.openseadragon, this.props.classifier, annotation);
      result.map((tile_overlay, id) => {
        this.props.openseadragon.addOverlay({
          element: tile_overlay.canvas,
          location: tile_overlay.tile.bounds
        });
      });
      return result;
    });
    this.props.savePrediction(results);
  }

  render() {
    return null;
  }
}


export default Predict;
