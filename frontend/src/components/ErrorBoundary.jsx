import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

// React error boundaries must be class components — there's no hook
// equivalent as of React 19. Catches render-time crashes anywhere in its
// subtree and shows a friendly fallback instead of a blank white screen.
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // No error-reporting service wired up yet (Sentry etc.) — at minimum
        // this keeps the crash visible in the console instead of vanishing
        // the moment the fallback UI renders.
        console.error("[ErrorBoundary] Caught a render error:", error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-cream flex items-center justify-center px-4">
                    <div className="max-w-md w-full text-center">
                        <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
                            <AlertTriangle size={36} className="text-accent" />
                        </div>
                        <h1 className="text-2xl font-bold text-charcoal">Oops, something went wrong</h1>
                        <p className="text-charcoal/60 mt-2">
                            We hit an unexpected snag on our end. Refreshing the page usually fixes it.
                        </p>
                        <button
                            onClick={this.handleReload}
                            className="mt-6 inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-6 py-3 rounded-full font-medium transition-all"
                        >
                            <RefreshCw size={18} /> Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
