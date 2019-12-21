import { connect } from 'react-redux'
import {
  savePrediction, 
} from '../redux/modules/predict.js'
import Predict from '../components/Predict.jsx'

const mapStateToProps = (state, ownProps) => {
  return {
    classifier: state.classifiers.get('current'),
    annotations: state.annotations.get('created'),
    results: state.predict.results
  }
}

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    savePrediction: (prediction) => { dispatch(savePrediction(prediction)) },
    }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  {forwardRef: true}
)(Predict);
