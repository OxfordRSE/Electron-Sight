import cv from 'opencv.js';

export default class TileOverlay {
//
// Stores openseadragon tiles along with classification data (from user).
//
// Has two responsibilities:
// 1. Creates a canvas that is used to draw the clasificaition data
// 2. Can return the classification data as training data for an SVM
//
  /// Contructor
  ///
  ///  @param {Openseadragon.Tile} tile: image tile
  ///  @param {TypedArray} labels: maps pixels to superpixel number
  ///  @param {array} features: 26*nsuperpixels array of features
  ///  @param {ImageData} src: the source image data for this tile
  constructor(tile, labels, features, src) {
    this.id = tile.cacheKey;
    this.tile = tile;
    this.src = src; 
    this.labels = new Int32Array(labels);
    this.nfeatures = 26;
    this.features = new Float64Array(features);
    this.canvas = document.createElement('canvas');
    this.canvas.style.zIndex = "2";
    this.context = this.canvas.getContext('2d');
    this.canvas.width = tile.sourceBounds.width;
    this.canvas.height = tile.sourceBounds.height;
    this.canvas.id = this.id;
    this.pixel_classification = new Int8Array(tile.sourceBounds.width * tile
      .sourceBounds.height);
    this.pixel_segmentation = new Int8Array(tile.sourceBounds.width * tile
      .sourceBounds.height);
    this.positive_superpixels = new Set();
    this.negative_superpixels = new Set();
    this.predict_superpixels = new Set();
    this.segmented = false;
  }


  copy() {
    let c = new TileOverlay(this.tile, this.labels, this.features, this.src);
    c.pixel_classification = new Int8Array(this.pixel_classification);
    c.pixel_segmentation = new Int8Array(this.pixel_segmentation);
    c.positive_superpixels = new Set(this.positive_superpixels);
    c.negative_superpixels = new Set(this.negative_superpixels);
    c.predict_superpixels = new Set(this.predict_superpixels);
    c.segmented = this.segmented;
    c.redraw();
    return c;
  }

  /// user has selected a superpixel and given it a new classification
  ///
  /// @param {int} selected_superpixel: number of selected superpixel
  /// @param {int} classification: -1 for negative classification, +1 for positive
  update_classification(selected_superpixel, classification) {

    // make sure superpixel is in the right list
    if (classification > 0) {
      if (selected_superpixel in this.positive_superpixels) {
        this.positive_superpixels.delete(selected_superpixel);
      } else {
        this.positive_superpixels.add(selected_superpixel);
      }
      this.negative_superpixels.delete(selected_superpixel);
    } else if (classification < 0) {
      if (selected_superpixel in this.negative_superpixels) {
        this.negative_superpixels.delete(selected_superpixel);
      } else {
        this.negative_superpixels.add(selected_superpixel);
      }
      this.positive_superpixels.delete(selected_superpixel);
    }

    // assign new classification to all the pixels in the tile from the
    // selected_superpixel
    for (let i = 0; i < this.pixel_classification.length; i++) {
      if (this.labels[i] == selected_superpixel) {
        this.pixel_classification[i] = this.pixel_classification[i] ==
          classification ? 0 : classification;
      }
    }
  }
  add_classification(selected_superpixel, classification) {
    for(let i = 0; i < this.pixel_classification.length; i++) {
      if (this.labels[i] == selected_superpixel) {
        this.pixel_classification[i] = classification;
      }
    }
  }

  //var xor = [
  //    [[0, 0], 0],
  //    [[0, 1], 1],
  //    [[1, 0], 1],
  //    [[1, 1], 0]
  //];
  generate_data(chosen_superpixel, classification) {
    const features_index = this.nfeatures * chosen_superpixel;
    const features = Array.from(this.features.slice(features_index, features_index +
      this.nfeatures));
    if(typeof classification === 'undefined') {
        return features;
    }
    else {
        return [features, classification];
    }
  }

  
 
  /// return training data for SVM as [features, classification], where features is an
  //  array of array of features, and classification is an array of classifications (0
  //  or 1)
  get_train_data() {
    var features = [];
    var classification = [];

    for (let i of this.positive_superpixels) {
      const [new_features, new_classification] = this.generate_data(i, 1)
      features.push(new_features);
      classification.push(new_classification);
    }
    for (let i of this.negative_superpixels) {
      const [new_features, new_classification] = this.generate_data(i, 0)
      features.push(new_features);
      classification.push(new_classification);

    }
    return [features, classification];
  }

  get_test_data() {
    var features = [];
    for (let i of this.predict_superpixels) {
        features.push(this.generate_data(i));
    }
    return features;
  }

  segment() {
    const rows = this.canvas.height;
    const cols = this.canvas.width;
    let src = new cv.Mat(rows, cols, cv.CV_8UC4);
    let opening = cv.Mat.zeros(rows, cols, cv.CV_8UC1);
    // Iterate through every pixel
    // pixel_classification is [1 = green, -1 = red, 0 = transparent]
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const index = i*cols + j;
        if (this.pixel_classification[index] > 0) {
          // classification 
          opening.ucharPtr(i, j)[0] = 255;
        }
        src.ucharPtr(i, j)[0] = this.src.data[index*4 + 0]; // R
        src.ucharPtr(i, j)[1] = this.src.data[index*4 + 1]; // G
        src.ucharPtr(i, j)[2] = this.src.data[index*4 + 2]; // B
        src.ucharPtr(i, j)[3] = this.src.data[index*4 + 3]; // A
      }
    }

    let background = new cv.Mat();
    let foreground = new cv.Mat();
    let distTrans = new cv.Mat();
    let unknown = new cv.Mat();
    let markers = new cv.Mat();
    // get background
    let M = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(opening, background, M, new cv.Point(-1, -1), 3);
    // distance transform
    cv.distanceTransform(opening, distTrans, cv.DIST_L2, 5);
    cv.normalize(distTrans, distTrans, 1, 0, cv.NORM_INF);
    // get foreground
    cv.threshold(distTrans, foreground, 0.7 * 1, 255, cv.THRESH_BINARY);
    foreground.convertTo(foreground, cv.CV_8U, 1, 0);
    cv.subtract(background, foreground, unknown);
    // get connected components markers
    cv.connectedComponents(foreground, markers);
    for (let i = 0; i < markers.rows; i++) {
        for (let j = 0; j < markers.cols; j++) {
            markers.intPtr(i, j)[0] = markers.ucharPtr(i, j)[0] + 1;
            if (unknown.ucharPtr(i, j)[0] == 255) {
                markers.intPtr(i, j)[0] = 0;
            }
        }
    }
    //cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
    //cv.watershed(src, markers);
    // copy segmentation
    for (let i = 0; i < markers.rows; i++) {
        for (let j = 0; j < markers.cols; j++) {
          const index = i*cols + j;
          this.pixel_segmentation[index] = foreground.intPtr(i, j)[0]; 
        }
    }
    console.log(markers);
    src.delete(); opening.delete(); background.delete();
    foreground.delete(); distTrans.delete(); unknown.delete(); markers.delete(); M.delete();
    this.segmented = true;
  }

  /// draws current classification data to the canvas
  redraw() {
    // default for createImageData is transparent black
    const imageData = this.context.createImageData(this.canvas.width, this.canvas
      .height);

    if (!this.segmented) {
      // pixel_classification is [1 = green, -1 = red, 0 = transparent]
      for (let i = 0; i < imageData.width * imageData.height; i++) {
        if (this.pixel_classification[i] > 0) {
          // green
          imageData.data[4 * i + 0] = 0;
          imageData.data[4 * i + 1] = 255;
          imageData.data[4 * i + 2] = 0;
          imageData.data[4 * i + 3] = 100;
        } else if (this.pixel_classification[i] < 0) {
          // red 
          imageData.data[4 * i + 0] = 255;
          imageData.data[4 * i + 1] = 0;
          imageData.data[4 * i + 2] = 0;
          imageData.data[4 * i + 3] = 100;
        }
      }
    } else {
      // pixel_segmentation is [-1 = border, 1 = background, X = cell number]
      for (let i = 0; i < imageData.width * imageData.height; i++) {
        if (this.pixel_segmentation[i] < 1) {
          // black borders
          imageData.data[4 * i + 0] = 0;
          imageData.data[4 * i + 1] = 0;
          imageData.data[4 * i + 2] = 0;
          imageData.data[4 * i + 3] = 100;
        } else if (this.pixel_segmentation[i] == 1) {
          // transparent background
          imageData.data[4 * i + 0] = 0;
          imageData.data[4 * i + 1] = 0;
          imageData.data[4 * i + 2] = 0;
          imageData.data[4 * i + 3] = 0;
        } else {
          // color by region
          imageData.data[4 * i + 0] = 0;
          imageData.data[4 * i + 1] = this.pixel_segmentation[i];
          imageData.data[4 * i + 2] = 0;
          imageData.data[4 * i + 3] = 100;
        }
      }
    }

    // Draw image data to the canvas
    this.context.putImageData(imageData, 0, 0);
  }
}
