"use client";

import React from "react";
import type { EnvironmentalEvent } from "@/types/environment";
import { CATEGORY_LABELS } from "@/types/environment";
import { getEventColor } from "@/lib/globe/event-visuals";
import { classifyFreshness } from "@/lib/nasa/eonet";

// ============================================================
// GlobeHoverTooltip — Shown when hovering globe markers
// ============================================================

type GlobeHoverTooltipProps = {
  event: EnvironmentalEvent | null;
  userLocationLabel?: string;
};

function freshnessLabel(event: EnvironmentalEvent): string {
  const f = classifyFreshness(event.updatedAt);
  switch (f) {
    case "live":
      return "Live";
    case "recent":
      return "Recent";
    case "aging":
      return "Aging";
    case "stale":
      return "Stale";
    default:
      return "Unknown";
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isUserLocation(
  event: EnvironmentalEvent | { id: string },
): event is { id: string } {
  return "id" in event && event.id === "user-location";
}

export default function GlobeHoverTooltip({
  event,
  userLocationLabel,
}: GlobeHoverTooltipProps) {
  if (!event) return null;

  // User location marker
  if (isUserLocation(event)) {
    return (
      <div style={tooltipStyle}>
        <div style={{ ...dotStyle, background: "#45A3FF" }} />
        <span style={{ color: "var(--color-text-primary)", fontSize: 13, fontWeight: 500 }}>
          {userLocationLabel ?? "Your location"}
        </span>
        <span style={{ color: "var(--color-text-muted)", fontSize: 10 }}>
          Not included in scoring
        </span>
      </div>
    );
  }

  // At this point TypeScript knows event is EnvironmentalEvent
  const envEvent = event as EnvironmentalEvent;
  const color = getEventColor(envEvent.category);
  const freshness = freshnessLabel(envEvent);

  return (
    <div style={tooltipStyle}>
      {/* Category + freshness */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ ...dotStyle, background: color }} />
        <span
          style={{
            color: "var(--color-text-secondary)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {CATEGORY_LABELS[envEvent.category] ?? envEvent.category}
        </span>
        <span
          style={{
            color: "var(--color-text-muted)",
            fontSize: 10,
          }}
        >
          · {freshness}
        </span>
      </div>

      {/* Title */}
      <p
        style={{
          color: "var(--color-text-primary)",
          fontSize: 13,
          fontWeight: 500,
          margin: "4px 0 0",
          lineHeight: 1.3,
          maxWidth: 240,
        }}
      >
        {envEvent.title}
      </p>

      {/* Meta */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 4,
          fontSize: 10,
          color: "var(--color-text-muted)",
        }}
      >
        <span>Score {envEvent.hotspotScore}</span>
        <span>{relativeTime(envEvent.updatedAt)}</span>
        <span>
          {envEvent.latitude.toFixed(1)}°, {envEvent.longitude.toFixed(1)}°
        </span>
      </div>

      <p
        style={{
          marginTop: 4,
          fontSize: 9,
          color: "var(--color-text-muted)",
          fontStyle: "italic",
        }}
      >
        Click to inspect
      </p>
    </div>
  );
}

// ---- Styles ----

const tooltipStyle: React.CSSProperties = {
  position: "fixed",
  top: 60,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 40,
  background: "var(--color-bg-panel)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid var(--color-border-hover)",
  borderRadius: 10,
  padding: "8px 14px",
  maxWidth: 300,
  pointerEvents: "none",
  boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
};

const dotStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  flexShrink: 0,
};
