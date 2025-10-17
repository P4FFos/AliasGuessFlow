import { Component } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * Error boundary specifically for socket-related errors
 */
class SocketErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('Socket Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // You can also log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    // Clear any stored state
    localStorage.removeItem('currentRoom');
    // Reload the page
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="card max-w-md w-full text-center">
            <WifiOff size={64} className="text-red mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Connection Error</h1>
            <p className="text-white/70 mb-6">
              We encountered a problem with the connection. This might be due to network issues or the server being unavailable.
            </p>
            
            {this.state.error && (
              <div className="bg-red/20 border border-red rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-mono text-white/80">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SocketErrorBoundary;
