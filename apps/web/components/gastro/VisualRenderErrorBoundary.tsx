'use client';

import { Component, type ReactNode } from 'react';

type Props = { fallback: ReactNode; children: ReactNode };

type State = { failed: boolean };

export class VisualRenderErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}
