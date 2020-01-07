import { combineReducers } from 'redux';
import annotations from './modules/annotations';
import applicationState from './modules/applicationState';
import classifiers from './modules/classifiers';
import predict from './modules/predict';

export default combineReducers({
  annotations, classifiers, predict, applicationState
})
