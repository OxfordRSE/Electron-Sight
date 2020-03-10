// From https://gist.github.com/davidgilbertson/de5e5b84373ee60d91525ab37278913e#file-mywindowportal-jsx
import React from 'react';
import ReactDOM from 'react-dom';

class WindowPortal extends React.PureComponent {
  constructor(props) {
    super(props);
    // STEP 1: create a container <div>
    this.externalWindow = null;
    this.state = { win: null, el: null };
  }
  
  render() {
    // STEP 2: append props.children to the container <div> that isn't mounted anywhere yet
    // return ReactDOM.createPortal(this.props.children, this.containerEl);
    const { el } = this.state;
    if (!el) {
      console.log('no element found');
      return null;
    }
    return ReactDOM.createPortal(this.props.children, el);
  }

  componentDidMount() {
    // STEP 3: open a new browser window and store a reference to it
    let win = window.open('', '', 'width=600,height=400,left=200,top=200');
    win.document.title = 'Plots';
    let el = document.createElement('div');
    win.document.body.appendChild(el);
    console.log('** appended child element');
    this.setState({ win, el });
    // STEP 4: append the container <div> (that has props.children appended to it) to the body of the new window
    //this.externalWindow.document.body.appendChild(this.containerEl);
  }

  componentWillUnmount() {
    // STEP 5: This will fire when this.state.showWindowPortal in the parent component becomes false
    // So we tidy up by closing the window
    this.state.win.close();
  }
}

export default WindowPortal;
