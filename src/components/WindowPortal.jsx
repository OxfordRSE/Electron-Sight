// From https://gist.github.com/davidgilbertson/de5e5b84373ee60d91525ab37278913e#file-mywindowportal-jsx
import React from 'react';
import ReactDOM from 'react-dom';

function copyStyles(sourceDoc, targetDoc) {
  Array.from(sourceDoc.styleSheets).forEach(styleSheet => {
    if (styleSheet.cssRules) { // true for inline styles
      const newStyleEl = sourceDoc.createElement('style');

      Array.from(styleSheet.cssRules).forEach(cssRule => {
        newStyleEl.appendChild(sourceDoc.createTextNode(cssRule.cssText));
      });

      targetDoc.head.appendChild(newStyleEl);
    } else if (styleSheet.href) { // true for stylesheets loaded from a URL
      const newLinkEl = sourceDoc.createElement('link');

      newLinkEl.rel = 'stylesheet';
      newLinkEl.href = styleSheet.href;
      targetDoc.head.appendChild(newLinkEl);
    }
  });
}

class WindowPortal extends React.Component {
  constructor(props) {
    super(props);
    // STEP 1: create a container <div>
    this.state = {
        externalWindow: null, containerElement: null
    }
  }
  
  render() {
    // STEP 2: append props.children to the container <div> that isn't mounted anywhere yet
    // return ReactDOM.createPortal(this.props.children, this.containerEl);
    if (!this.state.containerElement) {
      console.log('no element found');
      return null;
    }
    return ReactDOM.createPortal(this.props.children, this.state.containerElement);
  }

  componentDidMount() {
    // STEP 3: open a new browser window and store a reference to it
    const externalWindow = window.open("about:blank", 'Plots', 
                            'width=600,height=400,left=200,top=200');
    let containerElement = null;
    if (externalWindow) {
        containerElement = externalWindow.document.createElement('div');
        externalWindow.document.body.appendChild(containerElement);
        externalWindow.document.title = 'Plots';
        copyStyles(window.document, externalWindow.document);
        externalWindow.addEventListener('beforeunload', () => {
            this.props.closeWindow();
        });
    }
    this.setState({ externalWindow, containerElement });
  }

  componentWillUnmount() {
    if (this.state.externalWindow) {
       this.state.externalWindow.close();
    }
  }
}

export default WindowPortal;
