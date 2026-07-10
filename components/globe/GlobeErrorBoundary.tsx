"use client";

import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

// ============================================================
// GlobeErrorBoundary — WebGL fallback with retry
// No <style> tags to avoid hydration mismatches
// ============================================================

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class GlobeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[GlobeErrorBoundary]", error.message);
    if (info.componentStack) console.error(info.componentStack.slice(0, 300));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 2,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "var(--color-bg-deep)", gap: 16, padding: 24,
          }}
        >
          <h2 style={{ color: "var(--color-text-primary)", fontSize: 16, fontWeight: 600, margin: 0 }}>
            Globe unavailable
          </h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 13, maxWidth: 320, textAlign: "center", margin: 0, lineHeight: 1.5 }}>
            The 3D Earth could not be rendered. WebGL may be unavailable.
          </p>
          <p style={{ color: "var(--color-text-muted)", fontSize: 11, maxWidth: 320, textAlign: "center", margin: 0 }}>
            All environmental data is still accessible through the event panels.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: 8, padding: "8px 24px", borderRadius: 8,
              border: "none", background: "var(--color-location)",
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
