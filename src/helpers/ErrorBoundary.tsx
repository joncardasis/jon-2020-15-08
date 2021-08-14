import React from 'react';
import { captureException } from '../services/errorService';

class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  public componentDidCatch(error: any) {
    captureException(error);
  }

  public render() {
    return this.props.children;
  }
}

export default ErrorBoundary;
