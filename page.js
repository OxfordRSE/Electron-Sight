let OpenSeadragon = require('openseadragon');

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

viewer.addHandler("tile-loaded", function (data) {
  console.log("tile-loaded")
});

viewer.addHandler("tile-unloaded", function (data) {
  console.log("tile-unloaded")
});



let ipcRenderer = require('electron').ipcRenderer;

ipcRenderer.on('openFile', function(event, file) {
  console.log('openFile event for file:://' + file)
  viewer.open('file://' + file)

})
