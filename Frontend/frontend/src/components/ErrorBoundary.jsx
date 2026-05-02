import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-xl border border-red-500 bg-red-50 text-red-700 text-sm">
          <strong>Something went wrong rendering this chart.</strong>
          <br/>
          {this.state.error && this.state.error.toString()}
        </div>
      );
    }
    return this.props.children;
  }
}
