"use client";

import React from "react";

// ============================================================
// GlobeLoadingState — Polished loading indicator for the 3D globe
// ============================================================

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  position: "fixed",
  inset: 0,
  zIndex: 1,
  background: "transparent",
  gap: 20,
};

const spinnerWrapperStyle: React.CSSProperties = {
  position: "relative",
  width: 64,
  height: 64,
};

const outerRingStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "50%",
  border: "2px solid rgba(69, 163, 255, 0.25)",
  borderTopColor: "var(--color-success, #3BD5FF)",
  animation: "globe-spin 2s linear infinite",
};

const innerDotStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  width: 8,
  height: 8,
  marginTop: -4,
  marginLeft: -4,
  borderRadius: "50%",
  background: "var(--color-text-secondary, #8D9AAF)",
  animation: "globe-pulse 2s ease-in-out infinite",
};

const textStyle: React.CSSProperties = {
  color: "var(--color-text-secondary, #8D9AAF)",
  fontSize: 14,
  fontWeight: 400,
  letterSpacing: "0.02em",
  userSelect: "none",
};

export default function GlobeLoadingState() {
  return (
    <div style={containerStyle} aria-label="Loading globe" role="status">
      <style>{`
        @keyframes globe-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes globe-pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.5; }
          50% { transform: scale(1.4); opacity: 1; }
        }
      `}</style>

      <div style={spinnerWrapperStyle}>
        <div style={outerRingStyle} />
        <div style={innerDotStyle} />
      </div>

      <p style={textStyle}>Loading Earth view...</p>
    </div>
  );
}
