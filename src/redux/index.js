import { combineReducers } from 'redux';
import annotations from './modules/annotations';
import classifiers from './modules/classifiers';

export default combineReducers({
  annotations, classifiers
})
