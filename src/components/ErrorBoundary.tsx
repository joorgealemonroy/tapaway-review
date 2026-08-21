import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isChunkLoadError } from "@/lib/lazyWithRetry";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
  errorId?: string;
  showDetails: boolean;
  copied: boolean;
}

/**
 * Persist a crash into public.client_errors.
 * `user_id` is deliberately NOT sent — a BEFORE INSERT trigger stamps auth.uid()
 * server-side so ownership can never be spoofed from the browser.
 */
const logErrorToBackend = async (
  errorId: string,
  error: Error,
  errorInfo: React.ErrorInfo,
) => {
  try {
    const { error: insertError } = await supabase.from("client_errors").insert({
      error_message: `[${errorId}] ${error.message || String(error)}`,
      stack_trace: error.stack?.slice(0, 4000) ?? null,
      component_stack: errorInfo.componentStack?.slice(0, 4000) ?? null,
      route: `${window.location.pathname}${window.location.search}`,
      user_agent: navigator.userAgent.slice(0, 500),
    });
    if (insertError) {
      console.error("[ErrorBoundary] failed to persist error report", insertError);
    }
  } catch (e) {
    console.error("[ErrorBoundary] failed to persist error report", e);
  }
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, showDetails: false, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    // Always log the real Error object (stack preserved) — every environment.
    console.error(`[ErrorBoundary ${errorId}]`, error);
    console.error(`[ErrorBoundary ${errorId}] component stack:`, errorInfo.componentStack);
    this.setState({ errorId, componentStack: errorInfo.componentStack ?? undefined });
    // Stale-bundle chunk failures are handled by lazyWithRetry (retry + one
    // reload). They are not app crashes, so they must not pollute the log.
    if (isChunkLoadError(error.message || String(error))) return;
    void logErrorToBackend(errorId, error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  buildDetails = () => {
    const { errorId, error, componentStack } = this.state;
    return [
      `Error ID: ${errorId ?? "unknown"}`,
      `Route: ${window.location.pathname}${window.location.search}`,
      `Message: ${error?.message ?? "Unknown error"}`,
      "",
      "Stack:",
      error?.stack ?? "(no stack)",
      "",
      "Component stack:",
      componentStack ?? "(no component stack)",
    ].join("\n");
  };

  handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(this.buildDetails());
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      /* clipboard unavailable — details are still visible on screen */
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-xl w-full">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              We encountered an unexpected error. Please try reloading the page.
            </p>
            {this.state.errorId && (
              <p className="text-xs text-muted-foreground mb-4 font-mono">
                Error ID: {this.state.errorId}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
              >
                {this.state.showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {this.state.showDetails ? "Hide details" : "Show details"}
              </Button>
              <Button variant="ghost" className="gap-2" onClick={this.handleCopy}>
                <Copy className="h-4 w-4" />
                {this.state.copied ? "Copied" : "Copy details"}
              </Button>
            </div>

            {this.state.showDetails && (
              <pre className="text-left text-xs font-mono bg-muted text-muted-foreground rounded-lg p-3 max-h-72 overflow-auto whitespace-pre-wrap break-words">
                {this.buildDetails()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
