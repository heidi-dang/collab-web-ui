import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset: () => void;
}

interface State {
  hasError: boolean;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Canvas/Worker Crash Detected:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm border border-red-500/20">
          <div className="flex flex-col items-center gap-4 text-center p-6">
            <AlertTriangle className="text-red-500" size={48} />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Rendering Engine Crashed</h2>
              <p className="text-sm text-zinc-400 max-w-[300px]">
                The graphics worker has encountered a critical error. 
                Please perform a hard reset to clear the GPU buffer and re-sync.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw size={16} />
              Hard Reset Canvas
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
