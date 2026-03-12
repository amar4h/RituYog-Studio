import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Lightweight error boundary for individual pages.
 * Stays within the admin layout instead of taking over the full screen.
 */
export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PageErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Something went wrong</h2>
          <p className="text-sm text-gray-600 mb-4">This page encountered an error. Other pages still work fine.</p>

          {this.state.error && import.meta.env.DEV && (
            <details className="mb-4 w-full max-w-lg text-left bg-gray-100 rounded-lg p-3">
              <summary className="cursor-pointer text-xs font-medium text-gray-700">Technical details</summary>
              <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-24 whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            </details>
          )}

          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={this.handleRetry}>Try Again</Button>
            <Button size="sm" onClick={this.handleReload}>Reload Page</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
