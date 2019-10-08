import React, {PureComponent} from 'react';
import Annotations from './Annotations'
import Viewer from './Viewer'
import Classifier from './Classifier'
import Menu from './Menu'
import Scalebar from './Scalebar'
import Predict from './Predict'
const electron = window.require('electron');

const remote = electron.remote
const fs = remote.require('fs');


export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      openseadragon: null
    };
  }

  onOpen(openseadragon) {
    this.setState({ openseadragon: openseadragon });
    this.annotations.onOpen(openseadragon);
    this.predict.onOpen(openseadragon);
    this.classifier.onOpen(openseadragon);
    this.scalebar.onOpen(openseadragon);
  }

  render() {
    const { openseadragon } = this.state;
    return (
      <div>
      
      <Annotations 
        ref={annotations => {
          this.annotations = annotations;
        }}
      />
      <Predict
        classifier={this.classifier}
        ref={predict => {
          this.predict = predict;
        }}
      />

      <Classifier
        ref={classifier => {
          this.classifier = classifier;
        }}
      />
      <Scalebar ref={scalebar => {this.scalebar = scalebar;}} />
      <Viewer 
        onOpen={this.onOpen.bind(this)} ref={
        viewer => {this.viewer = viewer;}}
      />
      <Menu 
        openseadragon={openseadragon} 
        annotations={this.annotations} 
        predict={this.predict}
        classifier={this.classifier} 
        viewer={this.viewer} 
      />
      </div>
    );
  }
}
