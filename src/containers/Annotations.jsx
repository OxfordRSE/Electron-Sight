import { connect } from 'react-redux'
import {addPoint, createAnnotation} from '../redux/modules/annotations.js'
import Annotations from '../components/Annotations.jsx'

const mapStateToProps = (state, ownProps) => {
  return {
    annotations: state.annotations
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    createAnnotation: (name) => { dispatch(createAnnotation(name)) },
    setCurrentAnnotation: (name) => { dispatch(setCurrentAnnotation(name)) },
    addPoint: (position) => { dispatch(addPoint(position)) }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  {forwardRef: true}
)(Annotations);
