import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "sans-serif",
            textAlign: "center",
            padding: "2rem",
            background: "#e8edf2",
          }}
        >
          <h1 style={{ color: "#003865", fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            Something went wrong.
          </h1>
          <p style={{ color: "#555", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
            Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#003865",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "0.6rem 1.6rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
