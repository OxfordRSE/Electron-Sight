import cv from 'opencv.js';
const { List } = require("immutable");
import { isInside } from './geometry.js';
import OpenSeadragon from "openseadragon";

export default class TileCellData {
  constructor(superpixel_classification,annotation) {
    this.annotation = annotation;
    this.id = superpixel_classification.tile.cacheKey;
    this.tile = superpixel_classification.tile;
    this.superpixel_classification = superpixel_classification;

    this.centroids_x = List();
    this.centroids_y = List();
    this.widths = List();
    this.heights = List();
    this.angles = List();

    this.canvas = document.createElement('canvas');
    this.canvas.style.zIndex = "3";
    this.context = this.canvas.getContext('2d');
    this.canvas.width = this.tile.sourceBounds.width;
    this.canvas.height = this.tile.sourceBounds.height;
    this.canvas.id = `tile_cell_data ${this.id}`;

    this._segment();
  }


  copy() {
    let c = new TileCellData(this.superpixel_classification.copy(),this.annotation);
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

  _segment2() {
    const rows = this.canvas.height;
    const cols = this.canvas.width;

    let src = cv.Mat.zeros(rows, cols, cv.CV_8UC3);
    let mask = cv.Mat.zeros(rows, cols, cv.CV_8UC1);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const index = i*cols + j;
        if (this.superpixel_classification.pixel_classification[index] > 0) {
          // classification 
          mask.ucharPtr(i, j)[0] = 255;
        }
        src.ucharPtr(i, j)[0] = this.superpixel_classification.src.data[index*4 + 0]; // R
        src.ucharPtr(i, j)[1] = this.superpixel_classification.src.data[index*4 + 1]; // G
        src.ucharPtr(i, j)[2] = this.superpixel_classification.src.data[index*4 + 2]; // B
      }
    }
    let opening = new cv.Mat();
    let gray = new cv.Mat();
    let coinsBg = new cv.Mat();
    let coinsFg = new cv.Mat();
    let distTrans = new cv.Mat();
    let unknown = new cv.Mat();
    let markers = new cv.Mat();

    // get background
    let M = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.erode(mask, gray, M);
    cv.dilate(gray, opening, M);
    cv.dilate(opening, coinsBg, M, new cv.Point(-1, -1), 3);
    // distance transform
    cv.distanceTransform(opening, distTrans, cv.DIST_L2, 5);
    cv.normalize(distTrans, distTrans, 1, 0, cv.NORM_INF);
    // get foreground
    cv.threshold(distTrans, coinsFg, 0.7 * 1, 255, cv.THRESH_BINARY);
    coinsFg.convertTo(coinsFg, cv.CV_8U, 1, 0);
    cv.subtract(coinsBg, coinsFg, unknown);
    // get connected components markers
    cv.connectedComponents(coinsFg, markers);
    for (let i = 0; i < markers.rows; i++) {
        for (let j = 0; j < markers.cols; j++) {
            markers.intPtr(i, j)[0] = markers.ucharPtr(i, j)[0] + 1;
            if (unknown.ucharPtr(i, j)[0] == 255) {
                markers.intPtr(i, j)[0] = 0;
            }
        }
    }
    cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
    cv.watershed(src, markers);

    // draw barriers on mask
    for (let i = 0; i < markers.rows; i++) {
        for (let j = 0; j < markers.cols; j++) {
            if (markers.intPtr(i, j)[0] == -1) {
                mask.ucharPtr(i, j)[0] = 0; 
            }
        }
    }
    this.mask = mask;

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(mask, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    for (let i = 0; i < contours.size(); ++i) {
      if (hierarchy.intPtr(0, i)[2] >= 0) continue;
      //cv.drawContours(dst, contours, i, color, 1, cv.LINE_8, hierarchy, 100);
      const cell_area = cv.contourArea(contours.get(i));

      if (cell_area > 10) {
        // fit an ellipse
        const rotatedRect = cv.fitEllipse(contours.get(i));
        // add ellipse to data
        this.add_cell(rotatedRect.center.x, rotatedRect.center.y, rotatedRect.size.width, rotatedRect.size.height, rotatedRect.angle);
      }
    }
  
    src.delete(); gray.delete(); opening.delete(); coinsBg.delete();
    coinsFg.delete(); distTrans.delete(); unknown.delete(); markers.delete(); M.delete();
    contours.delete(); hierarchy.delete();
  }

  _segment() {
    const rows = this.canvas.height;
    const cols = this.canvas.width;

    // write pixel classification to mask
    let mask = cv.Mat.zeros(rows, cols, cv.CV_8UC1);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const index = i*cols + j;
        if (this.superpixel_classification.pixel_classification[index] > 0) {
          // classification 
          mask.ucharPtr(i, j)[0] = 255;
        }
      }
    }

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    let goal_max_area = 200;
    let max_area = 2*goal_max_area;

    //while (max_area > goal_max_area) {
    //for (let ii = 0; ii < 0; ++ii) {
    //  cv.findContours(mask, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    //  max_area = 0;
    //  for (let i = 0; i < contours.size(); ++i) {
    //    if (hierarchy.intPtr(0, i)[2] >= 0) continue;
    //    const color = new cv.Scalar(Math.ceil((i+1)/contours.size() * 255), 0, 0);
    //    //cv.drawContours(dst, contours, i, color, 1, cv.LINE_8, hierarchy, 100);
    //    const cell_area = cv.contourArea(contours.get(i));
    //    if (cell_area > max_area) {
    //      max_area = cell_area;
    //    }

    //    if (cell_area > goal_max_area) {
    //      const rotatedRect = cv.fitEllipse(contours.get(i));
    //      const vertices = cv.RotatedRect.points(rotatedRect);
    //      const point1 = new cv.Point(0.5*(vertices[0].x + vertices[1].x), 0.5*(vertices[0].y + vertices[1].y));
    //      const point2 = new cv.Point(0.5*(vertices[2].x + vertices[3].x), 0.5*(vertices[2].y + vertices[3].y));
    //      const line_color = new cv.Scalar(0, 0, 0);
    //      cv.line(mask, point1, point2, line_color, 2);
    //    }
    //  }
    //  console.log(`iteration max area is ${max_area}`);
    //}
    //console.log(`final max area is ${max_area}`);

    // Get easy access to the polygon
    let polygon = this.annotation.get('polygon');

    cv.findContours(mask, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    for (let i = 0; i < contours.size(); ++i) {
      if (hierarchy.intPtr(0, i)[2] >= 0) continue;
      //cv.drawContours(dst, contours, i, color, 1, cv.LINE_8, hierarchy, 100);
      const cell_area = cv.contourArea(contours.get(i));

      if (cell_area > 10) {
        // fit an ellipse
        const rotatedRect = cv.fitEllipse(contours.get(i));

        // Need to map point (in tile coords) to annotation (in % of image)
        let scale = this.tile.bounds.height / this.tile.sourceBounds.height;

        let shift_x = this.tile.x * this.tile.bounds.x / this.tile.x;
        let shift_y = this.tile.y * this.tile.bounds.y / this.tile.y;

        let point = new OpenSeadragon.Point(shift_x + rotatedRect.center.x * scale, shift_y + rotatedRect.center.y * scale);

        // Only add ellipse to data if point is inside annotation polygon
        if (isInside(polygon.toJS(),polygon.size,point)) {

          // add ellipse to data
          this.add_cell(rotatedRect.center.x, rotatedRect.center.y, rotatedRect.size.width, rotatedRect.size.height, rotatedRect.angle);
        }
      }
    }


    console.log(`finished segmenting, found ${this.centroids_x.size} cells`);

    mask.delete();
    contours.delete(); hierarchy.delete();
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

        //const color = new cv.Scalar(Math.ceil((i+1)/this.centroids_x.size * 255), 0, 0, 200);
        const color = new cv.Scalar(0, 0, 0, 200);
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
