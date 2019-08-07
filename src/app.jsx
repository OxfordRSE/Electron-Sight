import React, {PureComponent} from 'react';
import Annotations from './Annotations'
import Viewer from './Viewer'
import Menu from './Menu'
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
      <Viewer 
        onOpen={this.onOpen.bind(this)}
      />
      <Menu openseadragon={openseadragon} annotations={this.annotations}/>
      </div>
    );
  }
}
