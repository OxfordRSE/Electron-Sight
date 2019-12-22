const { Map, List } = require("immutable");

const SAVE = 'electron-sight/classifiers/SAVE'
const ADD_POINT = 'electron-sight/classifiers/ADD_POINT'
const LOAD = 'electron-sight/classifiers/CURRENT'
const ADD_SELECTED_TILE = 'electron-sight/classifiers/ADD_SELECTED_TILE'
const UPDATE_CLASSIFICATION = 'electron-sight/classifiers/UPDATE_CLASSIFICATION'
const CLEAR_SELECTED_TILES = 'electron-sight/classifiers/CLEAR_SELECTED_TILES'
const UPDATE_SUPERPIXEL_SIZE = 'electron-sight/menu/UPDATE_SUPERPIXEL_SIZE'
const UPDATE_ZOOM = 'electron-sight/menu/UPDATE_ZOOM'
const UPDATE_COST = 'electron-sight/menu/UPDATE_COST'
const UPDATE_GAMMA = 'electron-sight/menu/UPDATE_GAMMA'
const UPDATE_NAME = 'electron-sight/menu/UPDATE_NAME'


export function saveClassifier(svm, feature_min, feature_max, score) {
  return { type: SAVE, svm, feature_min, feature_max, score };
}

export function loadClassifier(classifier) {
  return { type: LOAD, classifier };
}

export function addSelectedTile(tile_overlay) {
  return { type: ADD_SELECTED_TILE, tile_overlay };
}

export function updateClassification(tile_id, selected_superpixel, classification) {
  return { type: UPDATE_CLASSIFICATION, tile };
}

export function clearSelectedTiles() {
  return { type: CLEAR_SELECTED_TILES };
}

export function updateName(name) {
  return { type: UPDATE_NAME, name: 'name', value: name};
}

export function updateZoom(zoom) {
  return { type: UPDATE_ZOOM, name: 'zoom', value: zoom};
}

export function updateSuperpixelSize(size) {
  return { type: UPDATE_SUPERPIXEL_SIZE, name: 'superpixel_size', value: size};
}

export function updateCost(cost) {
  return { type: UPDATE_COST, name: 'cost', value: cost};
}

export function updateGamma(gamma) {
  return { type: UPDATE_GAMMA, name: 'gamma', value: gamma};
}

const initialState = Map({
  created: Map(),
  current: Map({
    name: '', 
    zoom: 0,
    superpixel_size: 200,
    selected_tiles: Map(),
    cost: 0,
    gamma: 0,
  })
});

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case UPDATE_NAME:
    case UPDATE_GAMMA:
    case UPDATE_COST:
    case UPDATE_SUPERPIXEL_SIZE:
    case UPDATE_ZOOM:
      return state.set('current', state.get('current').set(action.name,action.value));
    case SAVE:
      const name = state.get('current').get('name');
      const zoom = state.get('current').get('zoom');
      const current = state.get('current')
                        .set('svm', action.svm)
                        .set('feature_min', action.feature_min)
                        .set('feature_max', action.feature_max)
                        .set('score', action.score);
      return state.set('created', state.get('created').set(name, current))
                  .set('current', initialState.get('current').set('zoom', zoom));
    case LOAD:
      return state.set('current', action.classifier);
    case ADD_SELECTED_TILE:
      return state.set('current', 
        state.get('current').set('selected_tiles', 
          state.get('current').get('selected_tiles').set(action.tile_overlay.id, action.tile_overlay)
        )
      );
    case CLEAR_SELECTED_TILES:
      return state.set('current', 
              state.get('current').set('selected_tiles', Map())
      );
    case UPDATE_CLASSIFICATION:
      let tile_overlay = state.get('current').get('selected_tiles').get(action.tile_id);
      tile_overlay.update_classification(action.selected_superpixel, action.classfication);
      tile_overlay.redraw();
      return state.set('current', 
              state.get('current').set('selected_tiles', 
                state.get('current').get('selected_tiles').set(action.tile_id, tile_overlay)
              )
      );
    default: 
      return state;
  }
}
