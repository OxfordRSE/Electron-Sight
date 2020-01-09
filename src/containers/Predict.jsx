import { connect } from 'react-redux'
import {
  saveTilePrediction, 
} from '../redux/modules/predict.js'
import Predict from '../components/Predict.jsx'

const mapStateToProps = (state, ownProps) => {
  return {
    classifier: state.classifiers.getIn(['created', state.classifiers.getIn(['current', 'name'])]),
    annotations: state.annotations.get('created'),
    results: state.predict.get('results'),
    show_cells: state.predict.get('show_cells'),
    show_superpixels: state.predict.get('show_superpixels'),
    show_plots: state.predict.get('show_plots')
  }
}

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    saveTilePrediction: (annotation_name, tile_overlay) => { 
      dispatch(saveTilePrediction(annotation_name, tile_overlay)) 
    },
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  {forwardRef: true}
)(Predict);
