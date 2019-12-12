
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
  constructor(tile, labels, features) {
    this.id = tile.cacheKey;
    this.tile = tile;
    this.labels = new Int32Array(labels);
    this.nfeatures = 26;
    this.features = new Float64Array(features);
    this.canvas = document.createElement("canvas");
    this.canvas.style.zIndex = "2";
    this.context = this.canvas.getContext('2d');
    this.canvas.width = tile.sourceBounds.width;
    this.canvas.height = tile.sourceBounds.height;
    this.canvas.id = this.id;
    this.pixel_classification = new Int8Array(tile.sourceBounds.width * tile
      .sourceBounds.height);
    this.positive_superpixels = new Set();
    this.negative_superpixels = new Set();
    this.predict_superpixels = new Set();
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

  /// draws current classification data to the canvas
  redraw() {
    // default for createImageData is transparent black
    const imageData = this.context.createImageData(this.canvas.width, this.canvas
      .height);

    // Iterate through every pixel
    // pixel_classification is [1 = green, -1 = red, 0 = transparent]
    for (let i = 0; i < imageData.width * imageData.height; i++) {
      if (this.pixel_classification[i] > 0) {
        // green
        imageData.data[4 * i + 1] = 255;
        imageData.data[4 * i + 3] = 100;
      } else if (this.pixel_classification[i] < 0) {
        // red
        imageData.data[4 * i + 0] = 255;
        imageData.data[4 * i + 3] = 100;
      }
    }

    // Draw image data to the canvas
    this.context.putImageData(imageData, 0, 0);
  }
}
