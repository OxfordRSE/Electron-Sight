import React from 'react';
import {
  H5,
  Divider,
} from "@blueprintjs/core";
import { VictoryBar } from 'victory';
import WindowPortal from './WindowPortal';

class Analytics extends React.Component {
  constructor(props) {
    super(props)
    this.state = {};
  }

  render() {
    // example showing how to loop through results tiles
    this.props.results.map(annotation_result => {
      annotation_result.map((tile_overlay, id) => {
        console.log(`results has tile ${id}`);
      });
    });
    return (
      <WindowPortal>
      <div id="Analytics">
      <H5>Data Analytics</H5>
      <Divider/>
      <div className="row">
        <div className="column">
          <VictoryBar/>
          <VictoryBar/>
        </div>
        <div className="column">
          <VictoryBar/>
          <VictoryBar/>
        </div>
     </div>
     </div>
     </WindowPortal>
    );
  }
}


export default Analytics;
