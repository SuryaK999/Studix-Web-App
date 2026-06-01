import { Component } from 'react';
import { AlertTriangle, HardDrive } from 'lucide-react';
import { Button } from './ui/button';

export class ErrorBoundary extends Component {
  state = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isDiskSpaceError = 
        this.state.error?.message.includes('IndexedDB') || 
        this.state.error?.message.includes('QuotaExceeded') ||
        this.state.error?.message.includes('idb-open');

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0a071c] text-white p-4 relative overflow-hidden">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-600/10 blur-[120px]" />
          </div>
          <div className="relative z-10 glass-panel p-8 max-w-lg w-full rounded-2xl border border-red-500/20 text-center shadow-2xl shadow-red-500/10">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              {isDiskSpaceError ? (
                <HardDrive className="w-8 h-8 text-red-400" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-400" />
              )}
            </div>
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            
            {isDiskSpaceError ? (
              <div className="text-gray-300 space-y-4 mb-8 text-left bg-black/20 p-4 rounded-xl">
                <p>
                  <strong className="text-red-400">Critical Error:</strong> The application failed to access local storage (IndexedDB).
                </p>
                <p>
                  This usually happens when your <strong className="text-white">C: drive is completely full</strong> or you are in strict private browsing mode. 
                  Firebase requires local storage to manage your session.
                </p>
                <p className="text-sm text-gray-400">
                  Try freeing up some space on your computer and refresh the page.
                </p>
              </div>
            ) : (
              <div className="text-gray-300 mb-8 bg-black/20 p-4 rounded-xl text-left overflow-auto max-h-40">
                <p className="font-mono text-sm text-red-300">
                  {this.state.error?.message || "Unknown error"}
                </p>
              </div>
            )}
            
            <Button 
              onClick={() => window.location.reload()}
              className="w-full bg-white text-black hover:bg-gray-200"
            >
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
