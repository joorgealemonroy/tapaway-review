import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

// Log errors to a backend for monitoring (non-blocking)
const logErrorToBackend = async (error: Error, errorInfo: React.ErrorInfo) => {
  try {
    // Generate a unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error(`[ErrorBoundary ${errorId}]`, error, errorInfo);
    }

    // In production, we could log to a monitoring service
    // For now, log to analytics_events as a lightweight solution
    await supabase.functions.invoke("track-event", {
      body: {
        restaurantId: "system",
        eventType: "error",
        eventData: {
          errorId,
          message: error.message,
          stack: error.stack?.slice(0, 500), // Truncate stack trace
          componentStack: errorInfo.componentStack?.slice(0, 500),
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
      },
    }).catch(() => {
      // Silently fail - don't cause more errors
    });

    return errorId;
  } catch {
    return undefined;
  }
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logErrorToBackend(error, errorInfo).then((errorId) => {
      if (errorId) {
        this.setState({ errorId });
      }
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              We encountered an unexpected error. Please try reloading the page.
            </p>
            {this.state.errorId && (
              <p className="text-xs text-muted-foreground mb-4 font-mono">
                Error ID: {this.state.errorId}
              </p>
            )}
            <Button onClick={this.handleReload} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
