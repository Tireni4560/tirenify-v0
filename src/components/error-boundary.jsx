// React error boundary — wraps the whole app so a render crash shows a
// readable message instead of an empty page. Class component because the
// React error-boundary API (getDerivedStateFromError / componentDidCatch) has
// no hooks equivalent yet. Shows the product name from brand.js only.
import { Component } from "react";
import { PRODUCT_FULL } from "../config/brand.js";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the detail out of the page; the terminal is enough for debugging.
    // eslint-disable-next-line no-console
    console.error("App crashed:", error, info?.componentStack || "");
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          maxWidth: "40rem",
          margin: "4rem auto",
          padding: "0 1rem",
          lineHeight: 1.5,
          color: "#e6edf7",
          background: "#060b18",
          minHeight: "100vh",
        }}
        role="alert"
      >
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
        <p style={{ color: "#9aa7bd" }}>
          {PRODUCT_FULL} hit an unexpected error and couldn’t finish loading this page.
          Your data on this device is safe — nothing was uploaded.
        </p>
        <p style={{ marginTop: "1rem" }}>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: 0,
              borderRadius: "0.5rem",
              padding: "0.6rem 1rem",
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Reload the page
          </button>
        </p>
      </div>
    );
  }
}
