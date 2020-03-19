import React from 'react';
import {
  H5,
  Divider,
} from "@blueprintjs/core";
import {
  VictoryBar,
  VictoryChart,
  VictoryTheme,
  VictoryAxis,
} from 'victory';
import WindowPortal from './WindowPortal';

function determinantPointPair(p1, p2) {
  return p1.x * p2.y - p1.y * p2.x;
}

function distancePointPair(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function count_cells_in_annotation(annotation_result) {
  return annotation_result.reduce((sum, tile_cell_data, id) => {
    return sum + tile_cell_data.centroids_x.size;
  }, 0);
}

function nearest_neighbour_distances_tile(tile_cell_data) {
  let n = tile_cell_data.centroids_x.size;
  let distances = []
  for (let i = 0; i < n; i++) {
    let p1 = {
      x: tile_cell_data.centroids_x.get(i),
      y: tile_cell_data.centroids_y.get(i)
    }
    let min_distance = Number.MAX_VALUE;
    for (let j = 0; j < n; j++) {
      if (i != j) {
        let p2 = {
          x: tile_cell_data.centroids_x.get(j),
          y: tile_cell_data.centroids_y.get(j)
        }
        let distance = distancePointPair(p1, p2);
        if (distance < min_distance) {
          min_distance = distance;
        }
      }
    }
    distances.push(min_distance);
  }
  return distances;
}

function nearest_neighbour_distances(annotation_result) {
  return annotation_result.reduce((sum, tile_cell_data, id) => {
    return sum.concat(nearest_neighbour_distances_tile(tile_cell_data));
  }, []);
}

function histogram(data) {
  let nBins = 10.0;
  let min = Number.MAX_VALUE;
  let max = 0.0;
  let n = data.length;
  for (let i = 0; i < n; i++) {
    if (data[i] < min) {
      min = data[i];
    }
    if (data[i] > max) {
      max = data[i] + 10*Number.EPSILON;
    }
  }
  let bin_width = (max - min) / nBins;
  let bins = new Array(nBins);
  for (let i = 0; i < nBins; i++) {
    bins[i] = min + (i + 0.5) * bin_width;
  }
  let values = new Array(nBins).fill(0);
  for (let i = 0; i < n; i++) {
    let bin_index = Math.floor((data[i] - min) / bin_width);
    values[bin_index]++;
  }
  return {bins, values};
}

function polygon_area(polygon) {
  let vertex_pairs = polygon.pop().zip(polygon.shift());
  return vertex_pairs.reduce((sum, vertex_pair) => {
    return sum + determinantPointPair(vertex_pair[0], vertex_pair[1]);
  }, 0);
}

class NearestNeighbourDistances extends React.Component {
  render() {
    let nn_distances =
      this.props.results.map((annotation_result, annotation_name) => {
        let distances = nearest_neighbour_distances(annotation_result);
        const {bins, values} = histogram(distances);
        return bins.map((bin, i) => {
          return {x: bin, y: values[i]};
        });
      });
    

    return (
      <VictoryChart
        theme={VictoryTheme.material}
        domainPadding={10}
      >
        <VictoryAxis label="Annotation" />
        <VictoryAxis dependentAxis label="Count" />
        {
          nn_distances.toArray().map((x) => {
            let name = x[0];
            let data = x[1];
          return (
            <VictoryBar
              key={name}
              interpolation="step"
              style={{data: {fill: "#c43a31"}}}
              data={data}
            />
          );
          })
        }
      </VictoryChart>
    );
  }
}


class CellCount extends React.Component {
  render() {
    let number_of_cells_in_each_region =
      Array.from(this.props.results.map((annotation_result, annotation_name) => {
        let cell_count = count_cells_in_annotation(annotation_result)
        return {x: annotation_name, y: cell_count};
      })).map(x => x[1]);  // Array.from(ImmutableMap) gives a ImmutableMap with second item as the value
    if (number_of_cells_in_each_region.length == 0) {
      number_of_cells_in_each_region = [{x: "none", y: 1}];
    }

    return (
      <VictoryChart
        theme={VictoryTheme.material}
        domainPadding={10}
      >
        <VictoryAxis label="Annotation" />
        <VictoryAxis dependentAxis label="Cell Count" />
        <VictoryBar
          style={{data: {fill: "#c43a31"}}}
          data={number_of_cells_in_each_region}
        />
      </VictoryChart>
    );
  }
}

class CellDensity extends React.Component {
  render() {
    let density_of_cells_in_each_region =
      Array.from(this.props.results.map((annotation_result, annotation_name) => {
        let cell_count = count_cells_in_annotation(annotation_result)
        let area = polygon_area(this.props.annotations.getIn([annotation_name, 'polygon']));
        return {x: annotation_name, y: cell_count / area};
      })).map(x => x[1]);  // Array.from(ImmutableMap) gives a ImmutableMap with second item as the value
    if (density_of_cells_in_each_region.length == 0) {
      density_of_cells_in_each_region = [{x: "none", y: 1}];
    }
    return (
      <VictoryChart
        theme={VictoryTheme.material}
        domainPadding={10}
      >
        <VictoryAxis label="Annotation" />
        <VictoryAxis dependentAxis label="Cell Density" />
        <VictoryBar
          style={{data: {fill: "#c43a31"}}}
          data={density_of_cells_in_each_region}
        />
      </VictoryChart>
    );
  }
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

    return (
      <WindowPortal>
        <div id="Analytics">
          <H5>Data Analytics</H5>
          <Divider />
          <div className="row">
            <div className="column">
              <CellCount
                results={this.props.results}
                annotations={this.props.annotations}
              />
              <CellDensity
                results={this.props.results}
                annotations={this.props.annotations}
              />
            </div>
            <div className="column">
              <NearestNeighbourDistances
                results={this.props.results}
                annotations={this.props.annotations}
              />
              <VictoryBar />
            </div>
          </div>
        </div>
      </WindowPortal>
    );
  }
}


export default Analytics;
