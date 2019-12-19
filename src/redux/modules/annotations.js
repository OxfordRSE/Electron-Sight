const { Map, List } = require("immutable");

const SAVE = 'electron-sight/annotations/SAVE'
const ADD_POINT = 'electron-sight/annotations/ADD_POINT'
const CURRENT = 'electron-sight/annotations/CURRENT'
const CURRENT_NAME = 'electron-sight/annotations/CURRENT_NAME'

export function saveAnnotation() {
  return { type: SAVE };
}

export function setCurrentAnnotation(name) {
  return { type: CURRENT, name };
}

export function setCurrentAnnotationName(name) {
  return { type: CURRENT_NAME, name };
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
    case SAVE:
      const name = state.get('current').get('name');
      return state.set('created', state.get('created').set(name, state.get('current')))
                  .set('current', initialState.get('current'));
    case ADD_POINT:
      return state.set('current', 
        state.get('current').set('polygon', state.get('current').get('polygon').push(action.position))
      );
    case CURRENT:
      return state.set('current', state.get('created').get(action.name));
    case CURRENT_NAME:
      return state.set('current', state.get('current').set('name', action.name));
    default: 
      return state;
  }
}
