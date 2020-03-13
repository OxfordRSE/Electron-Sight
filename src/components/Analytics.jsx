import React from 'react';
import {
  H5,
  Divider,
} from "@blueprintjs/core";
import { VictoryBar, VictoryChart, VictoryTheme } from 'victory';
import WindowPortal from './WindowPortal';

function determinantPointPair(p1, p2) {
    return p1.x * p2.y - p1.y * p2.x;
}

class Analytics extends React.Component {
  constructor(props) {
    super(props)
    this.state = {};
  }

  render() {
    //Numbers of cells in each region (e.g., in different regions as boxplot)
    //Cell densities (e.g., in different regions as boxplot)
    //Distributions of distance between NN cells
    //Distributions of distance between randomly chosen point and nearest cell (Spherical Contact Distance - SCD)
    //Differences between these things in different annotated regions (e.g., annotating 2 distinct regions and quickly viewing the comparison)
    // example showing how to loop through results tiles
    // THIS IS NOT WORKING - should return an array like so:
    // [ {x: annotation_name, y:number_of_cells},
    //   {x: annotation_name2, y:number_of_cells2},
    //   ...]
    let number_of_cells_in_each_region = 
      Array.from(this.props.results.map((annotation_result, annotation_name) => {
        let cell_count = annotation_result.reduce((sum, tile_cell_data, id) => {
          return sum + tile_cell_data.centroids_x.size;
        }, 0);
        return {x: annotation_name, y: cell_count};
      })).map(x => x[1]);  // Array.from(ImmutableMap) gives a ImmutableMap with second item as the value
    if (number_of_cells_in_each_region.length == 0) {
      number_of_cells_in_each_region = [{x: "none", y:1}];
    }

    return (
      <WindowPortal>
      <div id="Analytics">
      <H5>Data Analytics</H5>
      <Divider/>
      <div className="row">
        <div className="column">
          <VictoryChart
            theme={VictoryTheme.material}
            domainPadding={10}
          >
            <VictoryBar
              style={{ data: { fill: "#c43a31" } }}
              data={number_of_cells_in_each_region}
            />
          </VictoryChart>
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
