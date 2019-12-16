import React, {PureComponent} from 'react';
import Menu from './components/Menu'
const electron = window.require('electron');

const remote = electron.remote
const fs = remote.require('fs');


export default class App extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Menu/>
    );
  }
}
