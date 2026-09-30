import PageErrorState from "@/components/PageErrorState";
import { webHomePath } from "@/lib/webHomePath";
import useAuthStore from "@/store/authStore";
import { Component, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface BoundaryProps {
  children: ReactNode;
  homeHref?: string;
  resetKey: string;
}

interface BoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("GreenWay page error", error, info.componentStack);
  }

  componentDidUpdate(previous: BoundaryProps) {
    if (previous.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <PageErrorState
          kind="unexpected"
          onRetry={() => this.setState({ hasError: false })}
          homeHref={this.props.homeHref}
          homeLabel={this.props.homeHref === "/" ? "Go to home" : "Go to dashboard"}
          fullScreen
        />
      );
    }
    return this.props.children;
  }
}

const WebPageBoundary = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const role = useAuthStore((state) => state.user?.role);
  const homeHref = webHomePath(role);
  return <ErrorBoundary resetKey={`${location.pathname}${location.search}`} homeHref={location.pathname === homeHref ? undefined : homeHref}>{children}</ErrorBoundary>;
};

export default WebPageBoundary;
