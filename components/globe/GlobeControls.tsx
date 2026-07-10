"use client";

import React from "react";
import { Plus, Minus, RotateCcw, MapPin, Pause, Play } from "lucide-react";

// ============================================================
// GlobeControls — Restrained zoom, reset, user-focus buttons
// ============================================================

type GlobeControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFocusUser: () => void;
  onToggleAutoRotate: () => void;
  isAutoRotating: boolean;
  hasUserLocation: boolean;
};

const btnBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-bg-glass)",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  transition: "background 0.15s, color 0.15s, border-color 0.15s",
};

export default function GlobeControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onFocusUser,
  onToggleAutoRotate,
  isAutoRotating,
  hasUserLocation,
}: GlobeControlsProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 120,
        right: 16,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
      role="group"
      aria-label="Globe controls"
    >
      {/* Zoom in */}
      <button
        onClick={onZoomIn}
        style={btnBase}
        aria-label="Zoom in"
        title="Zoom in"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-bg-panel-hover)";
          e.currentTarget.style.color = "var(--color-text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-bg-glass)";
          e.currentTarget.style.color = "var(--color-text-secondary)";
        }}
      >
        <Plus size={16} strokeWidth={1.5} />
      </button>

      {/* Zoom out */}
      <button
        onClick={onZoomOut}
        style={btnBase}
        aria-label="Zoom out"
        title="Zoom out"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-bg-panel-hover)";
          e.currentTarget.style.color = "var(--color-text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-bg-glass)";
          e.currentTarget.style.color = "var(--color-text-secondary)";
        }}
      >
        <Minus size={16} strokeWidth={1.5} />
      </button>

      {/* Divider */}
      <div style={{ height: 1, margin: "2px 4px", background: "var(--color-border)" }} />

      {/* Reset view */}
      <button
        onClick={onReset}
        style={btnBase}
        aria-label="Reset view"
        title="Reset globe view"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-bg-panel-hover)";
          e.currentTarget.style.color = "var(--color-text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-bg-glass)";
          e.currentTarget.style.color = "var(--color-text-secondary)";
        }}
      >
        <RotateCcw size={15} strokeWidth={1.5} />
      </button>

      {/* Focus user location */}
      {hasUserLocation && (
        <button
          onClick={onFocusUser}
          style={btnBase}
          aria-label="My location"
          title="Focus on my location"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-bg-panel-hover)";
            e.currentTarget.style.color = "var(--color-location)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-bg-glass)";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
        >
          <MapPin size={15} strokeWidth={1.5} />
        </button>
      )}

      {/* Divider */}
      <div style={{ height: 1, margin: "2px 4px", background: "var(--color-border)" }} />

      {/* Toggle auto-rotate */}
      <button
        onClick={onToggleAutoRotate}
        style={btnBase}
        aria-label={isAutoRotating ? "Pause rotation" : "Resume rotation"}
        title={isAutoRotating ? "Pause rotation" : "Resume rotation"}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-bg-panel-hover)";
          e.currentTarget.style.color = "var(--color-text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-bg-glass)";
          e.currentTarget.style.color = "var(--color-text-secondary)";
        }}
      >
        {isAutoRotating ? (
          <Pause size={14} strokeWidth={1.5} />
        ) : (
          <Play size={14} strokeWidth={1.5} />
        )}
      </button>
    </div>
  );
}
