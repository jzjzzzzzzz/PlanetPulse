"use client";

import React from "react";
import type { EventCategory } from "@/types/environment";
import { CATEGORY_LABELS } from "@/types/environment";
import { getEventColor, USER_MARKER_COLOR } from "@/lib/globe/event-visuals";

// ============================================================
// GlobeLegend — Compact legend explaining marker visuals
// ============================================================

const CATEGORY_KEYS: EventCategory[] = [
  "wildfire",
  "severe-storm",
  "volcano",
  "flood",
  "drought",
  "dust-haze",
  "landslide",
  "sea-lake-ice",
  "other",
];

const containerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 120,
  left: 16,
  zIndex: 20,
  background: "var(--color-bg-glass)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 10,
  color: "var(--color-text-secondary)",
  maxWidth: 200,
  userSelect: "none",
};

const titleStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "var(--color-text-muted)",
  marginBottom: 8,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 3,
};

const dotStyle = (color: string): React.CSSProperties => ({
  width: 7,
  height: 7,
  borderRadius: "50%",
  backgroundColor: color,
  flexShrink: 0,
});

const ringIndicatorStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  border: "1.5px solid rgba(141, 154, 175, 0.5)",
  flexShrink: 0,
  background: "transparent",
};

const selectedIndicatorStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  border: "2px solid #F4F7FB",
  background: "rgba(244, 247, 251, 0.2)",
  flexShrink: 0,
};

export default function GlobeLegend() {
  return (
    <div
      style={containerStyle}
      className="hidden lg:block"
      role="complementary"
      aria-label="Globe marker legend"
    >
      <div style={titleStyle}>Marker Legend</div>

      {/* Categories */}
      {CATEGORY_KEYS.map((cat) => (
        <div key={cat} style={rowStyle}>
          <div style={dotStyle(getEventColor(cat))} />
          <span>{CATEGORY_LABELS[cat]}</span>
        </div>
      ))}

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "var(--color-border)",
          margin: "8px 0",
        }}
      />

      {/* Visual indicators */}
      <div style={rowStyle}>
        <div style={ringIndicatorStyle} />
        <span>High-score hotspot</span>
      </div>

      <div style={rowStyle}>
        <div style={selectedIndicatorStyle} />
        <span>Selected event</span>
      </div>

      <div style={rowStyle}>
        <div style={dotStyle(USER_MARKER_COLOR)} />
        <span>Your location</span>
      </div>

      <div style={{ ...rowStyle, fontSize: 9, color: "var(--color-text-muted)", marginTop: 4 }}>
        <span style={{ opacity: 0.5 }}>
          Marker size reflects hotspot score.
          <br />
          Not an official severity rating.
        </span>
      </div>
    </div>
  );
}
