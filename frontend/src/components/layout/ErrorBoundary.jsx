import { Component } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Catches render crashes anywhere below it and shows a way back instead of a blank page.
// Reported to Sentry when VITE_SENTRY_DSN is set (see lib/sentry.js).
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error("[ui]", error, info.componentStack);
    import("../../lib/sentry.js").then(({ captureUiError }) => captureUiError(error, { componentStack: info.componentStack }));
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page mx-auto max-w-lg py-20 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
        <h1 className="mt-4 text-2xl font-extrabold">Something broke on this page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {import.meta.env.DEV ? String(this.state.error?.message || this.state.error) : "The error was reported. Try going back, or reload."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
          <Button asChild>
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </div>
    );
  }
}
