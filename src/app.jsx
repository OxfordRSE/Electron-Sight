import React, {PureComponent} from 'react';
import Annotations from './Annotations'
import Viewer from './Viewer'
import Menu from './Menu'
import Scalebar from './Scalebar'
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
    console.log(this.annotations)
    this.annotations.onOpen(openseadragon);
    console.log(this.scalebar)
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
      <Scalebar ref={scalebar => {this.scalebar = scalebar;}} />
      <Viewer 
        onOpen={this.onOpen.bind(this)} ref={
        viewer => {this.viewer = viewer;}}
      />
      <Menu openseadragon={openseadragon} annotations={this.annotations} viewer={this.viewer} />
      </div>
    );
  }
}
