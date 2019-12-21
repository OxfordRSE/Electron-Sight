import OpenSeadragon from 'openseadragon';

export function create_tile(x, y, zoom_level, tile_source, context) {
  const tile_url = tile_source.getTileUrl(zoom_level, x, y);
  const tile_bounds = tile_source.getTileBounds(zoom_level, x, y, false);
  const tile_exists = tile_source.tileExists(zoom_level, x, y);
  const source_bounds = tile_source.getTileBounds(zoom_level, x, y, true);
  return new OpenSeadragon.Tile(zoom_level, x, y, tile_bounds, tile_exists, tile_url, context, false, null, source_bounds);
}


// uses OpenSeadragon's image loader to load up the tile, calls 
// this.on_tile_load once the tile is loaded
export function load_and_process_tile(tiledImage, tile, process_function) {
  tile.loading = true;
  tiledImage._imageLoader.addJob({
    src: tile.url,
    loadWithAjax: tile.loadWithAjax,
    ajaxHeaders: tile.ajaxHeaders,
    crossOriginPolicy: tiledImage.crossOriginPolicy,
    ajaxWithCredentials: tiledImage.ajaxWithCredentials,
    callback: (image, errorMsg, tileRequest) => {
      on_tile_load(tile, process_function, image, errorMsg, tileRequest);
    },
    abort: function() {
      tile.loading = false;
    }
  });
}

// called when a new tile is loaded. renders the image data to a new canvas to get the
// raw data, then superpixelates the image and creates a new TileOverlay for that tile
function on_tile_load(tile, process_function, image, errorMsg, tileRequest) {
  if (!image) {
    console.log("Tile %s failed to load: %s - error: %s", tile, tile.url,
      errorMsg);
    tile.loading = false;
    tile.exists = false;
    return;
  }
  console.log('tile loaded');

  // get image data
  var canvas = document.createElement('canvas');
  var context = canvas.getContext('2d');
  canvas.width = image.width;
  canvas.height = image.height;
  context.drawImage(image, 0, 0);
  var img_data = context.getImageData(0, 0, image.width, image.height);

  process_function(tile, img_data);
}

