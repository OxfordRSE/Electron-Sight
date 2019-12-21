const { Map, List } = require("immutable");

const SAVE = 'electron-sight/predict/SAVE'

export function savePrediction(prediction) {
  return { type: SAVE, prediction };
}

const initialState = { results: Map() };

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case SAVE:
      return { results: action.prediction };
    default: 
      return state;
  }
}
