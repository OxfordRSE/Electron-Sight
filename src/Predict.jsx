import React from 'react';
let slic = require('../addons/slic/slic');
const electron = window.require('electron');
import OpenSeadragon from 'openseadragon';
import TileOverlay from './TileOverlay'

// Check if point is in polygon source:
// https://www.geeksforgeeks.org/how-to-check-if-a-given-point-lies-inside-a-polygon/

// Given three colinear points p, q, r, the function checks if 
// point q lies on line segment 'pr' 
function onSegment(p, q, r)  { 
    if (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && 
            q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y)) 
        return true; 
    return false; 
} 
  
// To find orientation of ordered triplet (p, q, r). 
// The function returns following values 
// 0 --> p, q and r are colinear 
// 1 --> Clockwise 
// 2 --> Counterclockwise 
function orientation(p, q, r) 
{ 
    let val = (q.y - p.y) * (r.x - q.x) - 
              (q.x - p.x) * (r.y - q.y); 
  
    if (val == 0) return 0;  // colinear 
    return (val > 0)? 1: 2; // clock or counterclock wise 
} 
  
// The function that returns true if line segment 'p1q1' 
// and 'p2q2' intersect. 
function doIntersect(p1, q1, p2, q2) { 
    // Find the four orientations needed for general and 
    // special cases 
    let o1 = orientation(p1, q1, p2); 
    let o2 = orientation(p1, q1, q2); 
    let o3 = orientation(p2, q2, p1); 
    let o4 = orientation(p2, q2, q1); 
  
    // General case 
    if (o1 != o2 && o3 != o4) 
        return true; 
  
    // Special Cases 
    // p1, q1 and p2 are colinear and p2 lies on segment p1q1 
    if (o1 == 0 && onSegment(p1, p2, q1)) return true; 
  
    // p1, q1 and p2 are colinear and q2 lies on segment p1q1 
    if (o2 == 0 && onSegment(p1, q2, q1)) return true; 
  
    // p2, q2 and p1 are colinear and p1 lies on segment p2q2 
    if (o3 == 0 && onSegment(p2, p1, q2)) return true; 
  
     // p2, q2 and q1 are colinear and q1 lies on segment p2q2 
    if (o4 == 0 && onSegment(p2, q1, q2)) return true; 
  
    return false; // Doesn't fall in any of the above cases 
} 
  
// Returns true if the point p lies inside the polygon[] with n vertices 
function isInside(polygon, n, p) { 
    // There must be at least 3 vertices in polygon[] 
    if (n < 3)  return false; 
  
    // Create a point for line segment from p to infinite 
    // Note: max point value is 1.0
    let extreme = new OpenSeadragon.Point(2.0, p.y); 
  
    // Count intersections of the above line with sides of polygon 
    let count = 0, i = 0; 
    do
    { 
        let next = (i+1)%n; 
  
        // Check if the line segment from 'p' to 'extreme' intersects 
        // with the line segment from 'polygon[i]' to 'polygon[next]' 
        if (doIntersect(polygon[i], polygon[next], p, extreme)) 
        { 
            // If the point 'p' is colinear with line segment 'i-next', 
            // then check if it lies on segment. If it lies, return true, 
            // otherwise false 
            if (orientation(polygon[i], p, polygon[next]) == 0) 
               return onSegment(polygon[i], p, polygon[next]); 
  
            count++; 
        } 
        i = next; 
    } while (i != 0); 
  
    // Return true if count is odd, false otherwise 
    return count&1;  // Same as (count%2 == 1) 
} 

function inPolygon(polygon, bounds) {
  const n = polygon.length;
  const x = bounds.x;
  const y = bounds.y;
  const w = bounds.width;
  const h = bounds.height;
  return isInside(polygon,n,new OpenSeadragon.Point(x  ,y  )) ||
         isInside(polygon,n,new OpenSeadragon.Point(x+w,y  )) ||
         isInside(polygon,n,new OpenSeadragon.Point(x  ,y+h)) ||
         isInside(polygon,n,new OpenSeadragon.Point(x+w,y+h));
}

class Predict extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      drawing: false,
      cached_tiles: {},
      polygon: [],
    };
  }

  startDrawing() {
    this.setState({drawing: true, polygon: []});
  }

  endDrawing() {
    this.setState({drawing: false, polygon: [], cached_tiles: {}});
    const viewer = this.props.openseadragon;
    viewer.clearOverlays();
  }



  onClick(data) {
    console.log('predict onClick');
    const viewer = this.props.openseadragon;
    const tile_source = viewer.world.getItemAt(0).source;
    const webPoint = data.position;
    const imagePoint = viewer.viewport.windowToViewportCoordinates(webPoint);
    this.setState((state, props) => ({
      polygon: state.polygon.concat([imagePoint])
    }));
  }

  create_tile(x, y, zoom_level, tile_source, context) {
    const tile_url = tile_source.getTileUrl(zoom_level, x, y);
    const tile_bounds = tile_source.getTileBounds(zoom_level, x, y, false);
    const tile_exists = tile_source.tileExists(zoom_level, x, y);
    const source_bounds = tile_source.getTileBounds(zoom_level, x, y, true);
    return new OpenSeadragon.Tile(zoom_level, x, y, tile_bounds, tile_exists, tile_url, context, false, null, source_bounds);
  }

  onPredict() {
    console.log('called onPredict');
    const viewer = this.props.openseadragon;
    const tile_source = viewer.world.getItemAt(0).source;
    const openseadragon = this.props.openseadragon;
    const size = electron.remote.getCurrentWindow().getBounds();
    const viewport = this.props.openseadragon.viewport;
    const classifier = this.props.classifier;
    let svm = classifier.state.classifiers[
            classifier.state.classifier_active].classifier;

    const tiled_image = openseadragon.world.getItemAt(0);
    if (this.state.polygon.length > 2) {
      // get minimum bounding rectangle around polygon
      let min = new OpenSeadragon.Point(Infinity,Infinity) 
      let max = new OpenSeadragon.Point(-Infinity,-Infinity) 
      for (let i=0; i<this.state.polygon.length; i++) {
        let x = this.state.polygon[i].x
        let y = this.state.polygon[i].y
        if (x > max.x) {
          max.x = x;
        }
        if (x < min.x) {
          min.x = x;
        }
        if (y > max.y) {
          max.y = y;
        }
        if (y < min.y) {
          min.y = y;
        }
      }

      // loop over all tiles in that bounding rectangle and see which ones are in the
      // polygon
      const classifier = this.props.classifier;
      let level = classifier.state.classifiers[classifier.state.classifier_active].building_zoom;
      let min_tile = tile_source.getTileAtPoint(level, min);
      let max_tile = tile_source.getTileAtPoint(level, max);
      for (let x=min_tile.x; x<=max_tile.x; x++) {
        for (let y=min_tile.y; y<=max_tile.y; y++) {
          const tile = this.create_tile(x, y, level, tile_source, viewer.drawer.context);
          if (inPolygon(this.state.polygon, tile.bounds)) {
            if (tile.cacheKey in this.state.cached_tiles) {
              console.log(`tile already predicted`);
            } else {
              this.load_and_process_tile(tiled_image, tile);
            }
          }
        }
      }
    }
  }

  // uses OpenSeadragon's image loader to load up the tile, calls 
  // this.on_tile_load once the tile is loaded
  load_and_process_tile(tiledImage, tile) {
    tile.loading = true;
    tiledImage._imageLoader.addJob({
      src: tile.url,
      loadWithAjax: tile.loadWithAjax,
      ajaxHeaders: tile.ajaxHeaders,
      crossOriginPolicy: tiledImage.crossOriginPolicy,
      ajaxWithCredentials: tiledImage.ajaxWithCredentials,
      callback: (image, errorMsg, tileRequest) => {
        this.on_tile_load(tile, image, errorMsg, tileRequest);
      },
      abort: function() {
        tile.loading = false;
      }
    });
  }

  // called when a new tile is loaded. renders the image data to a new canvas to get the
  // raw data, then superpixelates the image and creates a new TileOverlay for that tile
  on_tile_load(tile, image, errorMsg, tileRequest) {
    const viewer = this.props.openseadragon;
    if (!image) {
      console.log("Tile %s failed to load: %s - error: %s", tile, tile.url,
        errorMsg);
      tile.loading = false;
      tile.exists = false;
      return;
    }
    console.log('tile loaded');

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);
    var img_data = context.getImageData(0, 0, image.width, image.height);

    const classifier = this.props.classifier;
    let superpixel_size = classifier.state.classifiers[
            classifier.state.classifier_active].superpixel_size;
    const [
        outlabels, outLABMeanintensities,
        outPixelCounts, outseedsXY,
        outLABVariances, outCollectedFeatures
      ] = slic.slic(img_data.data, img_data.width, img_data.height, superpixel_size);
    var tile_overlay = new TileOverlay(tile, outlabels, outCollectedFeatures);
    this.state.cached_tiles[tile.cacheKey] = tile_overlay;

    var n_superpixels = outPixelCounts.length
    var features = [];
    var i;
    for(i = 0; i < n_superpixels; i++ ) {
        features.push(tile_overlay.generate_data(i));
    }

    let svm = classifier.state.classifiers[
            classifier.state.classifier_active].classifier;
    let min = classifier.state.classifiers[
            classifier.state.classifier_active].feature_min;
    let max = classifier.state.classifiers[
            classifier.state.classifier_active].feature_max;

    for (let i = 0; i < features.length; i++) {
      for (let j = 0; j < features[i].length; j++) {
        features[i][j] = (features[i][j] - min[j]) / (max[j] - min[j]);
      }
    }
    var classification = svm.predict(features);

    for(i = 0; i < n_superpixels; i++ ) {
      tile_overlay.add_classification(i, (classification[i] > 0 ? 1 : -1));
    }
    tile_overlay.redraw();

    // add overlay to openseadragon
    viewer.addOverlay({
      element: tile_overlay.canvas,
      location: tile.bounds
    });

  }


  render() {
    const openseadragon = this.props.openseadragon;
    const size = electron.remote.getCurrentWindow().getBounds();
    const polygon = this.state.polygon;

    const classifier = this.props.classifier;
    if (this.state.drawing && classifier &&
        classifier.state.classifier_active) {
        const viewport = this.props.openseadragon.viewport;
        const tiled_image = openseadragon.world.getItemAt(0);
        let zoom_classifier = classifier.state.classifiers[
            classifier.state.classifier_active].building_zoom;
    }

    let path_str = '';
    const pixel_points = polygon.map(p => openseadragon.viewport
        .viewportToWindowCoordinates(p));
    const first_pt = pixel_points[0];
    if (polygon.length > 0) {
      const path_array = pixel_points.map(p => `L ${p.x} ${p.y}`);
      path_array[0] = `M ${first_pt.x} ${first_pt.y}`;
      path_str = path_array.join(' ');
    }

    const style = {
      position: 'absolute',
      display: 'block',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%'
    };
    return (
      <div id="Annotations">
      <svg style={style} id="annotation">
        {polygon.length > 0 && (
          <circle cx={first_pt.x} cy={first_pt.y} r={"5"}/>
        )
        }
        {polygon.length > 0 &&
          <path d={path_str} strokeWidth={"2"} stroke={"black"} fill={"none"}/>
        }
        {polygon.length > 0 &&
          <path d={path_str.concat(" Z")} 
                   stroke={"none"} 
                   fill={"green"} 
                   fillOpacity={"0.1"}/>

        }
      </svg>
      </div>
    )
  }
}


export default Predict;
