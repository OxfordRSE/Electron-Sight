const { Map, List, fromJS, isKeyed } = require("immutable");
import OpenSeadragon from 'openseadragon';
import Store from 'electron-store'

const SAVE = 'electron-sight/annotations/SAVE'
const SAVE_TO_STORE = 'electron-sight/annotations/SAVE_TO_STORE'
const LOAD_FROM_STORE = 'electron-sight/annotations/LOAD_FROM_STORE'
const ADD_POINT = 'electron-sight/annotations/ADD_POINT'
const CURRENT = 'electron-sight/annotations/CURRENT'
const UPDATE_NAME = 'electron-sight/annotations/UPDATE_NAME'
const CLEAR = 'electron-sight/annotations/CLEAR'
const CLEAR_SAVED = 'electron-sight/annotations/CLEAR_SAVED'

export function saveAnnotation() {
  return { type: SAVE };
}

export function saveAnnotationsToStore(name) {
  return { type: SAVE_TO_STORE, name: name };
}

export function loadAnnotationsFromStore(name) {
  return { type: LOAD_FROM_STORE, name: name };
}

export function clearAnnotation() {
  return { type: CLEAR };
}

export function clearSavedAnnotations() {
  return { type: CLEAR_SAVED };
}

export function setCurrentAnnotation(name) {
  return { type: CURRENT, name };
}

export function updateName(name) {
  return { type: UPDATE_NAME, name: 'name', value: name };
}

export function addPoint(position) {
  return { type: ADD_POINT, position };
}

const initialState = Map({
  created: Map(),
  current: Map({name: '', polygon: List()}),
  store: new Store({name: 'sight'})
});


export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case UPDATE_NAME:
      return state.set('current', state.get('current').set(action.name, action.value));
    case SAVE:
      const name = state.get('current').get('name');
      return state.set('created', state.get('created').set(name, state.get('current')))
                  .set('current', initialState.get('current'));
    case SAVE_TO_STORE:
      console.log(`saving annotations for filename ${action.name}`);
      state.get('store').set(`${action.name}.annotations`, state.get('created'));
      return state;
    case LOAD_FROM_STORE:
      console.log(`loading annotations for filename ${action.name}`);
      let annotations = state.get('store').get(`${action.name}.annotations`, Map());
      annotations = fromJS(annotations, (key, value, path) => {
        if (value.has('x') && value.has('y')) {
          return new OpenSeadragon.Point(value.get('x'), value.get('y'));
        } else {
          return isKeyed(value) ? value.toMap() : value.toList();
        }
      });
      return state.set('created', annotations);
    case ADD_POINT:
      return state.set('current', 
        state.get('current').set('polygon', state.get('current').get('polygon').push(action.position))
      );
    case CLEAR:
      return state.set('current', state.get('current').set('polygon', List()));
    case CLEAR_SAVED:
      return state.set('created', Map());
    case CURRENT:
      return state.set('current', state.get('created').get(action.name));
    default: 
      return state;
  }
}
