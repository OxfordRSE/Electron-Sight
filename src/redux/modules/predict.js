const { Map, List } = require("immutable");

const SAVE = 'electron-sight/predict/SAVE'
const UPDATE_SHOW_CELLS = 'electron-sight/predict/UPDATE_SHOW_CELLS'
const UPDATE_SHOW_SUPERPIXELS = 'electron-sight/predict/UPDATE_SHOW_SUPERPIXELS'

export function saveTilePrediction(annotation_name, tile_overlay) {
  return { type: SAVE, annotation_name, tile_overlay };
}

export function updateShowCells(value) {
  return { type: UPDATE_SHOW_CELLS, name:'show_cells', value };
}

export function updateShowSuperpixels(value) {
  return { type: UPDATE_SHOW_SUPERPIXELS, name:'show_superpixels', value };
}

const initialState = Map({ 
  show_cells: true,
  show_superpixels: false,
  results: Map() 
});

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case SAVE:
      const key = ['results', action.annotation_name, action.tile_overlay.id];
      const old_results = state.getIn(key); 
      return state.setIn(key, action.tile_overlay); 
    case UPDATE_SHOW_CELLS:
    case UPDATE_SHOW_SUPERPIXELS:
      return state.set(action.name, action.value);
    default: 
      return state;
  }
}
