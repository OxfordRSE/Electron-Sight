import { connect } from 'react-redux'
import {
  updateZoom as updateClassifierZoom,
  updateSuperpixelSize as updateClassifierSuperpixelSize,
  updateCost as updateClassifierCost,
  updateGamma as updateClassifierGamma,
  updateName as updateClassifierName,
} from '../redux/modules/classifiers.js'
import {
  updateName as updateAnnotationName,
} from '../redux/modules/annotations.js'
import {
  animClick,
  buildClick,
  predict,
  openFile,
} from '../redux/modules/applicationState.js'
import {
  updateShowCells as updatePredictShowCells,
  updateShowSuperpixels as updatePredictShowSuperpixels,
  updateShowPlots as updatePredictShowPlots,
} from '../redux/modules/predict.js'



import Menu from '../components/Menu.jsx'

const mapStateToProps = (state, ownProps) => {
  return {
    annotationName: state.annotations.get('current').get('name'),
    classifierName: state.classifiers.get('current').get('name'),
    classifierCost: state.classifiers.get('current').get('cost'),
    classifierGamma: state.classifiers.get('current').get('gamma'),
    classifierSuperpixelSize: state.classifiers.get('current').get('superpixel_size'),
    classifierZoom: state.classifiers.get('current').get('zoom'),
    classifiers: state.classifiers.get('created'),
    predictShowCells: state.predict.get('show_cells'),
    predictShowSuperpixels: state.predict.get('show_superpixels'),
    predictShowPlots: state.predict.get('show_plots'),
    mode: state.applicationState.mode,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateClassifierZoom: (zoom) => { dispatch(updateClassifierZoom(zoom)) },
    updateClassifierSuperpixelSize: (size) => { dispatch(updateClassifierSuperpixelSize(size)) },
    updateClassifierCost: (cost) => { dispatch(updateClassifierCost(cost)) },
    updateClassifierGamma: (gamma) => { dispatch(updateClassifierGamma(gamma)) },
    updateClassifierName: (name) => { dispatch(updateClassifierName(name)) },
    updateAnnotationName: (name) => { dispatch(updateAnnotationName(name)) },
    updatePredictShowCells: (value) => { dispatch(updatePredictShowCells(value)) },
    updatePredictShowSuperpixels: (value) => { dispatch(updatePredictShowSuperpixels(value)) },
    updatePredictShowPlots: (value) => { dispatch(updatePredictShowPlots(value)) },
    predict: (menu) => { dispatch(predict(menu)) },
    buildClick: (menu) => { dispatch(buildClick(menu)) },
    animClick: (menu) => { dispatch(animClick(menu)) },
    openFile: (menu, nodeData) => { dispatch(openFile(menu, nodeData)) },
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Menu);
