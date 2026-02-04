'use client';

import { Component } from 'react';
import DiceLogoMesh from './DiceLogoMesh';
import CrownMesh from './CrownMesh';

export default class ModelErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <DiceLogoMesh />
          <CrownMesh />
        </>
      );
    }
    return this.props.children;
  }
}
