import React from 'react';
import WindowPortal from './WindowPortal';
import Analytics from '../containers/Analytics';

class AnalyticsContainer extends React.Component {
  render() {
    return (
      <WindowPortal>
        <Analytics/>
      </WindowPortal>
    );
  }
}

export default AnalyticsContainer;
