let OpenSeadragon = require('openseadragon');
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

viewer.addHandler("update-tile", function (data) {
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

viewer.addHandler("tile-loaded", function (data) {
  console.log("tile-loaded")
  console.log(`\tlevel=${data.tile.level}`)
  console.log(`\tbounds=${data.tile.bounds}`)
  console.log(`\tsize=${data.tile.size}`)
  console.log(`\tloaded=${data.image.complete}`)
  console.log(`\timage=${data.image}`)
  console.log(`\timage type=${typeof data.image}`)
  var img_data = getImageData(data.image)
  console.log(`\tdata type=${typeof data}`)
  slic.slic(img_data.data, img_data.width, img_data.height)
  console.log(`data[0] = ${img_data.data[0]}`)
});

viewer.addHandler("tile-unloaded", function (data) {
  console.log("tile-unloaded")
});



let ipcRenderer = require('electron').ipcRenderer;

ipcRenderer.on('openFile', function(event, file) {
  console.log('openFile event for file:://' + file)
  viewer.open('file://' + file)

})
