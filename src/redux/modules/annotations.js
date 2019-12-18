const { Map, List } = require("immutable");

const CREATE = 'electron-sight/annotations/CREATE'
const ADD_POINT = 'electron-sight/annotations/ADD_POINT'
const CURRENT = 'electron-sight/annotations/CURRENT'

export function createAnnotation(name) {
  return { type: CREATE, name };
}

export function setCurrentAnnotation(name) {
  return { type: CURRENT, name };
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
      return state.set('created', state.get('created').set(action.name, state.get('current')))
                  .set('current', initialState.get('current'));
    case ADD_POINT:
      return state.set('current', 
        state.get('current').set('polygon', state.get('current').get('polygon').push(action.position))
      );
    case CURRENT:
      return state.set('current', state.get('created').get(action.name));
    default: 
      return state;
  }
}
