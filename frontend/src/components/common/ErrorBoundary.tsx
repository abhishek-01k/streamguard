import { Component, ErrorInfo, ReactNode } from 'react';
import { Card, Button } from '@radix-ui/themes';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error information
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });

    // You can also log the error to an error reporting service here
    // logErrorToMyService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { fallbackTitle = 'Something went wrong', fallbackMessage = 'An unexpected error occurred. Please try refreshing the page.' } = this.props;

      return (
        <div className="flex items-center justify-center min-h-[200px] p-4">
          <Card className="p-6 text-center bg-gray-800 border-gray-700 max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-white mb-2">{fallbackTitle}</h3>
            <p className="text-gray-400 mb-4">{fallbackMessage}</p>
            
            <div className="space-y-2">
              <Button 
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                className="bg-blue-600 hover:bg-blue-700 w-full"
              >
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 w-full"
              >
                Refresh Page
              </Button>
            </div>

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-red-400 cursor-pointer">Error Details (Dev Mode)</summary>
                <pre className="text-xs text-red-300 mt-2 p-2 bg-gray-900 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 