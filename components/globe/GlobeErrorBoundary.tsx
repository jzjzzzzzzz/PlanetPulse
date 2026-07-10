"use client";

import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

// ============================================================
// GlobeErrorBoundary — WebGL fallback with retry
// ============================================================

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export default class GlobeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[GlobeErrorBoundary] Globe failed:", error.message);
    if (info.componentStack) {
      console.error("[GlobeErrorBoundary] Stack:", info.componentStack.slice(0, 300));
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--color-bg-deep)",
            gap: 16,
            padding: 24,
          }}
        >
          {/* Orbit indicator */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: "2px solid rgba(69, 163, 255, 0.15)",
              borderTopColor: "rgba(69, 163, 255, 0.4)",
              animation: "globe-spin 3s linear infinite",
              marginBottom: 8,
            }}
          />

          <h2
            style={{
              color: "var(--color-text-primary)",
              fontSize: 16,
              fontWeight: 600,
              margin: 0,
            }}
          >
            Globe unavailable
          </h2>

          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 13,
              maxWidth: 320,
              textAlign: "center",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            The 3D Earth could not be rendered. This may happen if WebGL is
            unavailable or your browser does not support it.
          </p>

          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: 11,
              maxWidth: 320,
              textAlign: "center",
              margin: 0,
            }}
          >
            All environmental data remains accessible through the event panels.
          </p>

          <button
            onClick={this.handleRetry}
            style={{
              marginTop: 8,
              padding: "8px 24px",
              borderRadius: 8,
              border: "none",
              background: "var(--color-location)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Retry
          </button>

          {/* Inject spin animation */}
          <style>{`
            @keyframes globe-spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
