const { Map, List } = require("immutable");

const CREATE = 'electron-sight/annotations/CREATE'
const ADD_POINT = 'electron-sight/annotations/ADD_POINT'

export function createAnnotation(name) {
  return { type: CREATE, name };
}

export function addPoint(position) {
  return { type: ADD_POINT, position };
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
    case ADD_POINT:
      return state.set('current', 
        state.current.set('polygon', state.current.polygon.push(action.position))
      );
    default: 
      return state;
  }
}
