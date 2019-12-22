const { Map, List } = require("immutable");

const SAVE = 'electron-sight/predict/SAVE'

export function saveTilePrediction(annotation_name, tile_overlay) {
  return { type: SAVE, annotation_name, tile_overlay };
}
const initialState = { results: Map() };

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case SAVE:
      const key = [action.annotation_name, action.tile_overlay.id];
      const old_results = state.results.getIn(key); 
      return { results: state.results.setIn(key, action.tile_overlay) };
    default: 
      return state;
  }
}
