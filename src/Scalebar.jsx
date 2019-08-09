import React from 'react';
const electron = window.require('electron');

class Scalebar extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      zoomLevel: 1,
      type: "microscopy",
      openseadragon: null,
    };
  }
  render() {
      const style = {
          fontSize: this.props.fontSize || "10pt",
          fontFamily: this.props.fontFamily || "sans",
          textAlign: this.props.textAlign || "center",
          border: "none",
          borderBottom: (this.props.barThickness || 2) +
             "px solid" + (this.props.color || "black"),
          backgroundColor: this.props.backgroundColor || "white",
          width: this.props.width + "px"
      }
      return (<div id="Scalebar" style={style}></div>)
  }
}
