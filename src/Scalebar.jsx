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
  update() {
      var viewport = this.viewer.viewport;

      // we only have one image, so world[0]
      var tiledImage = this.viewer.world.getItemAt(0);
      var zoom = tiledImageViewportToImageZoom(tiledImage,
              viewport.getZoom(true));
      var currentPPM = zoom * this.props.pixelsPerMeter;
      var props = getScalebarSizeAndTextForMetric(currentPPM, this.props.minWidth || "150px");
      this.setState({
          size: props.size,
          text: props.text
      })
  }
  render() {
      const style = {
          fontSize: this.props.fontSize,
          fontFamily: this.props.fontFamily,
          textAlign: this.props.textAlign,
          border: this.props.border,
          borderBottom: +this.props.barThickness +
             "px solid " + this.props.color,
          backgroundColor: this.props.backgroundColor,
          width: +this.state.size + "px"
      }
      return (<div id="Scalebar" style={style}>{this.state.text}</div>)
  }
}

Scalebar.defaultProps = {
    backgroundColor: "white",
    border: "none",
    textAlign: "center",
    fontFamily: "sans-serif",
    fontSize: "10pt"
}

// Missing TiledImage.viewportToImageZoom function in OSD 2.0.0
function tiledImageViewportToImageZoom(tiledImage, viewportZoom) {
    var ratio = tiledImage._scaleSpring.current.value *
            tiledImage.viewport._containerInnerSize.x /
            tiledImage.source.dimensions.x;
    return ratio * viewportZoom;
}

function getScalebarSizeAndTextForMetric(ppm, minSize, unitSuffix="m") {
    var value = normalize(ppm, minSize);
    var factor = roundSignificand(value / ppm * minSize, 3);
    var size = value * minSize;
    var valueWithUnit = getWithUnit(factor, unitSuffix);
    return {
        size: size,
        text: valueWithUnit
    };
}

function normalize(value, minSize) {
    var significand = getSignificand(value);
    var minSizeSign = getSignificand(minSize);
    var result = getSignificand(significand / minSizeSign);
    if (result >= 5) {
        result /= 5;
    }
    if (result >= 4) {
        result /= 4;
    }
    if (result >= 2) {
        result /= 2;
    }
    return result;
}

function getSignificand(x) {
    return x * Math.pow(10, Math.ceil(-log10(x)));
}

function roundSignificand(x, decimalPlaces) {
    var exponent = -Math.ceil(-log10(x));
    var power = decimalPlaces - exponent;
    var significand = x * Math.pow(10, power);
    // To avoid rounding problems, always work with integers
    if (power < 0) {
        return Math.round(significand) * Math.pow(10, -power);
    }
    return Math.round(significand) / Math.pow(10, power);
}

function log10(x) {
    return Math.log(x) / Math.log(10);
}

function getWithUnit(value, unitSuffix) {
    if (value < 0.000001) {
        return value * 1000000000 + " n" + unitSuffix;
    }
    if (value < 0.001) {
        return value * 1000000 + " μ" + unitSuffix;
    }
    if (value < 1) {
        return value * 1000 + " m" + unitSuffix;
    }
    if (value >= 1000) {
        return value / 1000 + " k" + unitSuffix;
    }
    return value + " " + unitSuffix;
}
