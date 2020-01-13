import { connect } from 'react-redux'
import Analytics from '../components/Analytics.jsx'

const mapStateToProps = (state, ownProps) => {
  console.log('state.predict');
  console.log(state.predict)
  return {
    results: state.predict.get('results'),
  }
}

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Analytics);
