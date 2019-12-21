import { combineReducers } from 'redux';
import annotations from './modules/annotations';
import classifiers from './modules/classifiers';
import predict from './modules/predict';

export default combineReducers({
  annotations, classifiers, predict
})
