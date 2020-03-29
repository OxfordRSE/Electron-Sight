import { connect } from 'react-redux'
import {
  addPoint, 
  saveAnnotation, 
  setCurrentAnnotation,
  clearAnnotation,
  clearSavedAnnotations,
  saveAnnotationsToStore,
  loadAnnotationsFromStore,
  updateName
} from '../redux/modules/annotations.js'

import Annotations from '../components/Annotations.jsx'

const mapStateToProps = (state, ownProps) => {
  return {
    annotations: state.annotations,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    saveAnnotation: () => { dispatch(saveAnnotation()) },
    saveAnnotationsToStore: (name) => { dispatch(saveAnnotationsToStore(name)) },
    loadAnnotationsFromStore: (name) => { dispatch(loadAnnotationsFromStore(name)) },
    setCurrentAnnotation: (name) => { dispatch(setCurrentAnnotation(name)) },
    updateName: (name) => { dispatch(updateName(name)) },
    addPoint: (position) => { dispatch(addPoint(position)) },
    clearAnnotation: () => { dispatch(clearAnnotation()) },
    clearSavedAnnotations: () => { dispatch(clearSavedAnnotations()) }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  {forwardRef: true}
)(Annotations);
