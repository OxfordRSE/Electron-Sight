import { connect } from 'react-redux'
import {
  saveClassifier, 
  loadClassifier, 
  updateName,
  updateClassification,
  saveClassifiersToStore,
  loadClassifiersFromStore,
  clearSelectedTiles,
  addSelectedTile
} from '../redux/modules/classifiers.js'

import Classifiers from '../components/Classifiers.jsx'

const mapStateToProps = (state, ownProps) => {
  return {
    classifiers: state.classifiers
  }
}

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    saveClassifiersToStore: () => { dispatch(saveClassifiersToStore()); },
    loadClassifiersFromStore: () => { dispatch(loadClassifiersFromStore()); },
    saveClassifier: (svm, min, max, score) => { 
      ownProps.openseadragon.clearOverlays();
      dispatch(saveClassifier(svm, min, max, score)) 
    },
    loadClassifier: (classifier) => { 
      // make sure all internal stuff in tile_overlay is **copied** across
      const new_selected_tiles = classifier.get('selected_tiles').map((tile_overlay, tile_id) => {
        return tile_overlay.copy();
      });

      // update openseadragon overlays
      const build_mode = ownProps.mode.modeName == "BuildClassifier"; 
      if (build_mode) {
        console.log('clearing overlays');
        ownProps.openseadragon.clearOverlays();
        new_selected_tiles.map((tile_overlay, id) => {
          ownProps.openseadragon.addOverlay({
            element: tile_overlay.canvas,
            location: tile_overlay.tile.bounds
          });
        });
      }

      // dispatch with **copied** classifier
      dispatch(loadClassifier(classifier.set('selected_tiles', new_selected_tiles))); 
    },
    updateName: (name) => { dispatch(updateName(name)) },
    updateClassification: (tile_id, selected_superpixel, classification) => {     
      dispatch(updateClassification(tile_id, selected_superpixel, classification)) 
    },
    addSelectedTile: (tile_overlay) => { 
      ownProps.openseadragon.addOverlay({
        element: tile_overlay.canvas,
        location: tile_overlay.tile.bounds
      });
      dispatch(addSelectedTile(tile_overlay)) 
    },
    clearSelectedTiles: () => { 
      ownProps.openseadragon.clearOverlays();
      dispatch(clearSelectedTiles()) 
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  {forwardRef: true}
)(Classifiers);
