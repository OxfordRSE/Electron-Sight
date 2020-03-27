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

function spherical_contact_distances_tile(tile_cell_data) {
  let N = 100;
  let n = tile_cell_data.centroids_x.size;
  let distances = []

  let min_x = Number.MAX_VALUE;
  let max_x = 0.0;
  let min_y = Number.MAX_VALUE;
  let max_y = 0.0;
  for (let i = 0; i < n; i++) {
    let x = tile_cell_data.centroids_x.get(i);
    let y = tile_cell_data.centroids_y.get(i);
    if (min_x > x) {
      min_x = x;
    }
    if (max_x < x) {
      max_x = x;
    }
    if (min_y > y) {
      min_y = y;
    }
    if (max_y < y) {
      max_y = y;
    }
  }
  for (let i = 0; i < N; i++) {
    let p1 = {
      x: Math.random()*(max_x-min_x) + min_x,
      y: Math.random()*(max_y-min_y) + min_y
    }
    let min_distance = Number.MAX_VALUE;
    for (let j = 0; j < n; j++) {
      let p2 = {
        x: tile_cell_data.centroids_x.get(j),
        y: tile_cell_data.centroids_y.get(j)
      }
      let distance = distancePointPair(p1, p2);
      if (distance < min_distance) {
        min_distance = distance;
      }
    }
    distances.push(min_distance);
  }
  return distances;
}

function nearest_neighbour_distances_tile(tile_cell_data) {
  let n = tile_cell_data.centroids_x.size;
  let distances = []
  if (n == 1) {
    return distances;
  }
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

// Function to give index of the median given two end points
function median(l, r) { 
    let n = r - l + 1; 
    n = Math.floor((n + 1) / 2) - 1; 
    return n + l; 
} 
  
// Function to calculate IQR of sorted array
function IQR(array) { 
    let n = array.length;
  
    // Index of median of entire data 
    let mid_index = median(0, n); 
  
    // Median of first half 
    let Q1 = array[median(0, mid_index)]; 
  
    // Median of second half 
    let Q3 = array[median(mid_index + 1, n)]; 
  
    // IQR calculation 
    return (Q3 - Q1); 
} 

function histogram(data) {
  data.sort((a, b) => a - b);
  let n = data.length;

  // if data empty return a zero histogram
  if (n == 0) {
    let bins = [0.0];
    let values = [0];
    return {bins, values};
  }

  let min = data[0];
  let max = data[n - 1];
  console.log('min')
  console.log(min)
  console.log('max')
  console.log(max)
  
  // The Freedman-Diaconis rule 
  let bin_width = 2 * IQR(data) * Math.pow(n, -1.0/3.0);
  console.log('bin_width')
  console.log(bin_width)
  let nBins = Math.floor((max - min) / bin_width) + 1;
  console.log('nBins')
  console.log(nBins)
  bin_width = (max - min + 0.5 * bin_width) / nBins;
  let bins = new Array(nBins);
  for (let i = 0; i < nBins; i++) {
    bins[i] = min + (i + 0.5) * bin_width;
  }
  let values = new Array(nBins).fill(0);
  for (let i = 0; i < n; i++) {
    let bin_index = Math.floor((data[i] - min) / bin_width);
    values[bin_index]++;
  }
  for (let i = 0; i < n; i++) {
    values[i] /= n;
  }
  return {bins, values};
}

function polygon_area(polygon) {
  let vertex_pairs = polygon.pop().zip(polygon.shift());
  return vertex_pairs.reduce((sum, vertex_pair) => {
    return sum + determinantPointPair(vertex_pair[0], vertex_pair[1]);
  }, 0);
}

class SphericalContactDistances extends React.Component {
  render() {
    let sc_distances =
      this.props.results.map((annotation_result, annotation_name) => {
        let distances = annotation_result.reduce((sum, tile_cell_data, id) => {
            return sum.concat(spherical_contact_distances_tile(tile_cell_data));
          }, []);
        const {bins, values} = histogram(distances);
        return bins.map((bin, i) => {
          return {x: bin, y: values[i]};
        });
      });
    

    return (
      <VictoryChart
        theme={VictoryTheme.material}
        domainPadding={10}
        width={this.props.width}
        height={this.props.height}
      >
        <VictoryAxis 
          label="SC Distance" 
          style={this.props.axis_style}
        />
        <VictoryAxis 
          dependentAxis 
          label="Likelihood" 
          style={this.props.axis_style}
        />
        {
          sc_distances.toArray().map((x, i) => {
            let name = x[0];
            let data = x[1];
          return (
            <VictoryBar
              key={name}
              barRatio={1.0}
              interpolation="step"
              style={{data: {
                        fill: this.props.colors[name],
                        fillOpacity: 0.4,
                        }
                      }}
              data={data}
            />
          );
          })
        }
      </VictoryChart>
    );
  }
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
        width={this.props.width}
        height={this.props.height}
      >
        <VictoryAxis 
          label="NN distance" 
          style={this.props.axis_style}
        />
        <VictoryAxis 
          dependentAxis 
          label="Likelihood" 
          style={this.props.axis_style}
        />
        {
          nn_distances.toArray().map((x, i) => {
            let name = x[0];
            let data = x[1];
          return (
            <VictoryBar
              key={name}
              barRatio={1.0}
              interpolation="step"
              style={{data: {
                        fill: this.props.colors[name],
                        fillOpacity: 0.4,
                        }
                      }}
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
    let max = 0;
    let number_of_cells_in_each_region =
      Array.from(this.props.results.map((annotation_result, annotation_name) => {
        let cell_count = count_cells_in_annotation(annotation_result)
        if (cell_count > max) {
          max = cell_count;
        }
        return {x: annotation_name, y: cell_count, fill: this.props.colors[annotation_name]};
      })).map(x => x[1]);  // Array.from(ImmutableMap) gives a ImmutableMap with second item as the value
    if (number_of_cells_in_each_region.length == 0) {
      number_of_cells_in_each_region = [{x: "none", y: 1}];
    }

    return (
      <VictoryChart
        theme={VictoryTheme.material}
        width={this.props.width}
        height={this.props.height}
        domainPadding={this.props.width / number_of_cells_in_each_region.length}
        maxDomain={max*1.1}
      >
        <VictoryAxis 
          style={this.props.axis_style}
        />
        <VictoryAxis dependentAxis 
          style={this.props.axis_style}
          label="Cell Count" 
        />
        <VictoryBar
          barRatio={0.8}
          style={{
            data: {
              fill: ({ datum }) => datum.fill,
            }
          }}
          data={number_of_cells_in_each_region}
        />
      </VictoryChart>
    );
  }
}

class CellDensity extends React.Component {
  render() {
    let max = 0;
    let density_of_cells_in_each_region =
      Array.from(this.props.results.map((annotation_result, annotation_name) => {
        let cell_count = count_cells_in_annotation(annotation_result)
        let area = polygon_area(this.props.annotations.getIn([annotation_name, 'polygon']));
        let density = cell_count / area;
        if (density > max) {
          max = density;
        }
        return {x: annotation_name, y: density, fill: this.props.colors[annotation_name]};
      })).map(x => x[1]);  // Array.from(ImmutableMap) gives a ImmutableMap with second item as the value
    if (density_of_cells_in_each_region.length == 0) {
      density_of_cells_in_each_region = [{x: "none", y: 1}];
    }
    return (
      <VictoryChart
        width={this.props.width}
        height={this.props.height}
        theme={VictoryTheme.material}
        domainPadding={this.props.width / density_of_cells_in_each_region.length}
        maxDomain={max*1.1}
      >
        <VictoryAxis 
          style={this.props.axis_style}
        />
        <VictoryAxis dependentAxis 
          label="Cell Density" 
          style={this.props.axis_style}
        />
        <VictoryBar
          barRatio={0.8}
          style={{
            data: {
              fill: ({ datum }) => datum.fill,
            }
          }}
          data={density_of_cells_in_each_region}

        />
      </VictoryChart>
    );
  }
}


class Analytics extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      width: null,
      height: null,
    };

  }

  updateDimensions = () => {
    console.log('update dimensions');
    console.log(this.window_ref.offsetWidth);
    console.log(this.window_ref.offsetHeight);
    this.setState({
      width: this.window_ref.offsetWidth,
      height: this.window_ref.offsetHeight,
    });
  };

  componentDidMount() {
    this.updateDimensions();
    window.addEventListener("resize", this.updateDimensions.bind(this));
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateDimensions.bind(this));
  }

  render() {
    //Distributions of distance between randomly chosen point and nearest cell (Spherical Contact Distance - SCD)
    //Differences between these things in different annotated regions (e.g., annotating 2 distinct regions and quickly viewing the comparison)
    //
    let axis_style = {axisLabel: {padding: 40}};
    let annotation_colors = ["#F44336", "#9C27B0", "#2196F3", "#4CAF50", "#795548", "#607D8B"]
    let i = 0;
    annotation_colors = this.props.results.map((result, name) => {
      return annotation_colors[i++];
    }).toJS();

    let window_width = 600;
    if (this.state.width && this.state.width > 0) {
      window_width = this.state.window_width;
    }

    let plot_width = window_width / 2;
    let plot_height = window_width / 3;

    if (this.state.width) {
      console.log('width');
      console.log(this.state.width);
    }

    return (
      <div className="analytics" ref={el => (this.window_ref = el)}>
        <div className="analytics-plot1">
          <CellCount
            results={this.props.results}
            annotations={this.props.annotations}
            axis_style={axis_style}
            colors={annotation_colors}
            width={plot_width}
            height={plot_height}
          />
        </div>
        <div className="analytics-plot2">
          <CellDensity
            results={this.props.results}
            annotations={this.props.annotations}
            axis_style={axis_style}
            colors={annotation_colors}
            width={plot_width}
            height={plot_height}
          />
        </div>
        <div className="analytics-plot3">
          <NearestNeighbourDistances
            results={this.props.results}
            annotations={this.props.annotations}
            colors={annotation_colors}
            axis_style={axis_style}
            width={plot_width}
            height={plot_height}
          />
        </div>
        <div className="analytics-plot4">
          <SphericalContactDistances
            results={this.props.results}
            annotations={this.props.annotations}
            colors={annotation_colors}
            axis_style={axis_style}
            width={plot_width}
            height={plot_height}
          />
        </div>
      </div>
    );
  }
}


export default Analytics;
