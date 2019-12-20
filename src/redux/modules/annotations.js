const { Map, List } = require("immutable");

const SAVE = 'electron-sight/annotations/SAVE'
const ADD_POINT = 'electron-sight/annotations/ADD_POINT'
const CURRENT = 'electron-sight/annotations/CURRENT'
const UPDATE_NAME = 'electron-sight/annotations/UPDATE_NAME'

export function saveAnnotation() {
  return { type: SAVE };
}

export function setCurrentAnnotation(name) {
  return { type: CURRENT, name };
}

export function updateName(name) {
  return { type: CURRENT_NAME, name: 'name', value: name };
}

export function addPoint(position) {
  return { type: ADD_POINT, position };
}

const initialState = Map({
  created: Map(),
  current: Map({name: '', polygon: List()})
});

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case UPDATE_NAME:
      return state.set('current', state.get('current').set(action.name, action.value));
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
    default: 
      return state;
  }
}
