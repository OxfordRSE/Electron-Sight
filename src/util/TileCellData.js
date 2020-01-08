import cv from 'opencv.js';
const { List } = require("immutable");

export default class TileCellData {
  constructor(tile) {
    this.id = tile.cacheKey;
    this.tile = tile

    this.centroids_x = List();
    this.centroids_y = List();
    this.widths = List();
    this.heights = List();
    this.angles = List();

    this.canvas = document.createElement('canvas');
    this.canvas.style.zIndex = "2";
    this.context = this.canvas.getContext('2d');
    this.canvas.width = tile.sourceBounds.width;
    this.canvas.height = tile.sourceBounds.height;
    this.canvas.id = this.id;
  }


  copy() {
    let c = new TileCellData(this.tile);
    c.centroids_x = this.centroids_x
    c.centroids_y = this.centroids_y
    c.widths = this.widths;
    c.heights = this.heights;
    c.angles = this.angles;
    redraw();
    return c;
  }

  add_cell(x, y, w, h, a) {
    this.centroids_x = this.centroids_x.push(x);
    this.centroids_y = this.centroids_y.push(y);
    this.widths = this.widths.push(w);
    this.heights = this.heights.push(h);
    this.angles = this.angles.push(a);
  }

  segment() {
    const rows = this.canvas.height;
    const cols = this.canvas.width;
    let src = new cv.Mat(rows, cols, cv.CV_8UC4);
    let dst = cv.Mat.zeros(rows, cols, cv.CV_8UC3);
    let mask = cv.Mat.zeros(rows, cols, cv.CV_8UC1);
    // Iterate through every pixel
    // pixel_classification is [1 = green, -1 = red, 0 = transparent]
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const index = i*cols + j;
        if (this.pixel_classification[index] > 0) {
          // classification 
          mask.ucharPtr(i, j)[0] = 255;
        }
        src.ucharPtr(i, j)[0] = this.src.data[index*4 + 0]; // R
        src.ucharPtr(i, j)[1] = this.src.data[index*4 + 1]; // G
        src.ucharPtr(i, j)[2] = this.src.data[index*4 + 2]; // B
        src.ucharPtr(i, j)[3] = this.src.data[index*4 + 3]; // A
      }
    }

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    let goal_max_area = 200;
    let max_area = 2*goal_max_area;

    //while (max_area > goal_max_area) {
    for (let ii = 0; ii < 4; ++ii) {
      cv.findContours(mask, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
      max_area = 0;
      for (let i = 0; i < contours.size(); ++i) {
        if (hierarchy.intPtr(0, i)[2] >= 0) continue;
        const color = new cv.Scalar(Math.ceil((i+1)/contours.size() * 255), 0, 0);
        //cv.drawContours(dst, contours, i, color, 1, cv.LINE_8, hierarchy, 100);
        const cell_area = cv.contourArea(contours.get(i));
        if (cell_area > max_area) {
          max_area = cell_area;
        }

        if (cell_area > goal_max_area) {
          const rotatedRect = cv.fitEllipse(contours.get(i));
          const vertices = cv.RotatedRect.points(rotatedRect);
          const point1 = new cv.Point(0.5*(vertices[0].x + vertices[1].x), 0.5*(vertices[0].y + vertices[1].y));
          const point2 = new cv.Point(0.5*(vertices[2].x + vertices[3].x), 0.5*(vertices[2].y + vertices[3].y));
          const line_color = new cv.Scalar(0, 0, 0);
          cv.line(mask, point1, point2, line_color, 2);
        }
      }
      console.log(`iteration max area is ${max_area}`);
    }
    console.log(`final max area is ${max_area}`);

    for (let i = 0; i < contours.size(); ++i) {
      if (hierarchy.intPtr(0, i)[2] >= 0) continue;
      const color = new cv.Scalar(Math.ceil((i+1)/contours.size() * 255), 0, 0);
      //cv.drawContours(dst, contours, i, color, 1, cv.LINE_8, hierarchy, 100);
      const cell_area = cv.contourArea(contours.get(i));

      if (cell_area > 10) {
        const rotatedRect = cv.fitEllipse(contours.get(i));
        cv.ellipse1(dst, rotatedRect, color, 1, cv.LINE_8);
      }
    }

    // copy segmentation
    for (let i = 0; i < dst.rows; i++) {
        for (let j = 0; j < dst.cols; j++) {
          const index = i*cols + j;
          this.pixel_segmentation[index] = dst.ucharPtr(i, j)[0]; 
        }
    }

    src.delete(); mask.delete(); dst.delete();
    contours.delete(); hierarchy.delete();
    this.segmented = true;
  }

  /// draws current classification data to the canvas
  redraw() {
    
    // draw ellipses using opencv
    const rows = this.canvas.height;
    const cols = this.canvas.width;
    let dst = cv.Mat.zeros(rows, cols, cv.CV_8UC4);
    for (let i = 0; i < this.centroids_x.size; ++i) {
        const rotatedRect = {
          center : new cv.Point(this.centroids_x.get(i), this.centroids_y.get(i)),
          size : new cv.Size(this.widths.get(i), this.heights.get(i)),
          angle: this.angles.get(i)
        };

        cv.ellipse1(dst, rotatedRect, color, 1, cv.LINE_8);
    }

    // copy opencv mat to imageData
    const imageData = this.context.createImageData(this.canvas.width, this.canvas
      .height);

    for (let i = 0; i < dst.rows; i++) {
      for (let j = 0; j < dst.cols; j++) {
        const index = i*cols + j;
        const nchannels = 4;
        for (let c = 0; c < nchannels; c++) {
          imageData.data[nchannels*index + c] = dst.ucharPtr(i, j)[c]; 
        }
      }
    }

    // Draw image data to the canvas
    this.context.putImageData(imageData, 0, 0);
  }
}
