const { Map, List } = require("immutable");

const CREATE = 'electron-sight/annotations/CREATE`

export function createAnnotation(name) {
  return { type: CREATE, name};
}

const initialState = Map({
  created: Map(),
  current: Map({polygon: List()})
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
