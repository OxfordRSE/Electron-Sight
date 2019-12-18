const { Map, List } = require("immutable");

const CREATE = 'electron-sight/classifiers/CREATE'

export function createClassifier(name) {
  return { type: CREATE, name};
}

const initialState = Map({
  created: Map(),
  current: Map({cost: 0, gamma: 0, superpixel_size: 100, zoom: null})
});

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case CREATE:
      return state.set('created', state.created.set(action.name, state.current))
                  .set('current', initialState.current);
    default: 
      return state;
  }
}
