import { connect } from 'react-redux'
import {
  addPoint, 
  saveAnnotation, 
  setCurrentAnnotation, 
  updateName
} from '../redux/modules/annotations.js'

import Annotations from '../components/Annotations.jsx'

const mapStateToProps = (state, ownProps) => {
  return {
    annotations: state.annotations
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    saveAnnotation: () => { dispatch(saveAnnotation()) },
    setCurrentAnnotation: (name) => { dispatch(setCurrentAnnotation(name)) },
    updateName: (name) => { dispatch(updateName(name)) },
    addPoint: (position) => { dispatch(addPoint(position)) }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  {forwardRef: true}
)(Annotations);
