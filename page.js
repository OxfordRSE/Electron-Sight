let OpenSeadragon = require('openseadragon');
let palette = require('google-palette');
let Color = require('color');
let slic = require('./slic');

viewer = OpenSeadragon({
  id: "openseadragon1",
  prefixUrl: "node_modules/openseadragon/build/openseadragon/images/",
  animationTime: 0.5,
  blendTime: 0.1,
  constrainDuringPan: true,
  maxZoomPixelRatio: 2,
  minZoomLevel: 1,
  visibilityRatio: 1,
  zoomPerScroll: 2
});

viewer.addHandler("update-tile", function(data) {
  console.log("update-tile")
});

function getImageData(img) {
  // Create an empty canvas element
  var canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  // Copy the image contents to the canvas
  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  // Return all the pixel data
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

function createTileOverlay(id, image, overlay) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width; 
  canvas.height = image.height;
  canvas.id = id;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(image);

  console.log(`creating an overlay (${imageData.width}x${imageData.height})`)
  var max = Math.max(...overlay)
  var min = Math.min(...overlay)
  var uniqueSuperPixels = new Set(overlay)
  console.log("superpixels", uniqueSuperPixels.size)
  console.log("maxOverlay", max)
  console.log("minOverlay", min)
  var colors = palette('tol-dv', uniqueSuperPixels.size).map(x => Color('#' + x))
  var superpixelsColorMap = new Map(Array.from(uniqueSuperPixels).map(function (e, i) {
      return [e, colors[i]];
  }));
  // Iterate through every pixel
  for (let i = 0; i < imageData.width * imageData.height; i++) {
    // Modify pixel data, convert to RGBA
    imageData.data[4 * i] =  superpixelsColorMap.get(overlay[i]).red();
    imageData.data[4 * i + 1] = superpixelsColorMap.get(overlay[i]).green();
    imageData.data[4 * i + 2] = superpixelsColorMap.get(overlay[i]).blue();
    imageData.data[4 * i + 3] = 20; // A value
  }
  console.log("overlay", overlay)
  console.log(imageData.data)

  // Draw image data to the canvas
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

overlays = {};

viewer.addHandler("tile-loaded", function(data) {
  console.log("tile-loaded")
  console.log(`\tlevel=${data.tile.level}`)
  console.log(`\tbounds=${data.tile.bounds}`)
  console.log(`\tsize=${data.tile.size}`)
  console.log(`\tloaded=${data.image.complete}`)
  console.log(`\timage=${data.image}`)
  console.log(`\timage type=${typeof data.image}`)
  var img_data = getImageData(data.image)
  console.log(`\tdata type=${typeof data}`)

  const [
    outlabels, outLABMeanintensities,
    outPixelCounts, outseedsXY,
    outLABVariances, outCollectedFeatures
  ] = slic.slic(img_data.data, img_data.width, img_data.height)

  // create overlay
  viewer.addOverlay({
    element: createTileOverlay(data.tile.cacheKey, img_data, outlabels),
    location: data.tile.bounds
  });

});

viewer.addHandler("tile-unloaded", function(data) {
  console.log("tile-unloaded")

  // clean up overlay
  viewer.removeOverlay(data.tile.cacheKey);
});



let ipcRenderer = require('electron').ipcRenderer;

ipcRenderer.on('openFile', function(event, file) {
  console.log('openFile event for file:://' + file)
  viewer.open('file://' + file)

})
