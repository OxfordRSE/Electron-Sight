const { Map, List, fromJS, isKeyed } = require("immutable");
import Store from 'electron-store'
import { defaultClassifier } from './defaultClassifier'

const SAVE = 'electron-sight/classifiers/SAVE'
const ADD_POINT = 'electron-sight/classifiers/ADD_POINT'
const LOAD = 'electron-sight/classifiers/CURRENT'
const SAVE_TO_STORE = 'electron-sight/classifiers/SAVE_TO_STORE'
const LOAD_FROM_STORE = 'electron-sight/classifiers/LOAD_FROM_STORE'
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

export function saveClassifiersToStore() {
  return { type: SAVE_TO_STORE };
}

export function loadClassifiersFromStore() {
  return { type: LOAD_FROM_STORE };
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

function loadInitialState() {
  console.log(`loading classifiers`);
  let store = new Store({name: 'sight'});
  let classifiers = store.get(`classifiers`, Map());
  classifiers = fromJS(classifiers, (key, value, path) => {
    return isKeyed(value) ? value.toMap() : value.toList();
  });
  if (classifiers.size == 0) {
    console.log(defaultClassifier);
    classifiers = Map({
      'default': 
      fromJS(defaultClassifier)
    });
  }
  return classifiers;

}

const initialState = Map({
  created: loadInitialState(),
  current: Map({
    name: '', 
    zoom: 0,
    superpixel_size: 200,
    selected_tiles: Map(),
    cost: 0,
    gamma: 0,
  }),
  store: new Store({name: 'sight'})
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
    case SAVE_TO_STORE:
      console.log(`saving classifiers`);
      state.get('store').set(`classifiers`, state.get('created'));
      return state;
    case LOAD_FROM_STORE:
      return state.set('created', loadInitialState());
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
