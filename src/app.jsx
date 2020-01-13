import React from 'react'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import reducer from './redux/index'
import Menu from './containers/Menu'
const electron = window.require('electron');


const remote = electron.remote
const fs = remote.require('fs');

const store = createStore(reducer);

export default class App extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Provider store={store}>
      <Menu />
      </Provider>
    );
  }
}
