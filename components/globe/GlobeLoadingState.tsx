"use client";

import React from "react";

// ============================================================
// GlobeLoadingState — polished loading indicator
// ============================================================

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  position: "fixed",
  inset: 0,
  zIndex: 1,
  background: "var(--color-bg-deep)",
  gap: 20,
};

const orbitWrapperStyle: React.CSSProperties = {
  position: "relative",
  width: 80,
  height: 80,
};

const outerRingStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "50%",
  border: "2px solid rgba(69, 163, 255, 0.12)",
  borderTopColor: "rgba(69, 163, 255, 0.5)",
  animation: "globe-loading-spin 2.5s linear infinite",
};

const innerRingStyle: React.CSSProperties = {
  position: "absolute",
  inset: 10,
  borderRadius: "50%",
  border: "1.5px solid rgba(61, 213, 255, 0.1)",
  borderBottomColor: "rgba(61, 213, 255, 0.3)",
  animation: "globe-loading-spin 1.8s linear infinite reverse",
};

const dotStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  width: 6,
  height: 6,
  marginTop: -3,
  marginLeft: -3,
  borderRadius: "50%",
  background: "var(--color-text-muted)",
  animation: "globe-loading-pulse 2s ease-in-out infinite",
};

const textStyle: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontSize: 13,
  fontWeight: 400,
  letterSpacing: "0.04em",
  userSelect: "none",
};

export default function GlobeLoadingState() {
  return (
    <div style={containerStyle} aria-label="Initializing live Earth" role="status">
      <style>{`
        @keyframes globe-loading-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes globe-loading-pulse {
          0%, 100% { transform: scale(0.7); opacity: 0.4; }
          50% { transform: scale(1.5); opacity: 1; }
        }
      `}</style>

      <div style={orbitWrapperStyle}>
        <div style={outerRingStyle} />
        <div style={innerRingStyle} />
        <div style={dotStyle} />
      </div>

      <p style={textStyle}>Initializing live Earth</p>
    </div>
  );
}
