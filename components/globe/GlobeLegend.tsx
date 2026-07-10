"use client";

import React, { useState } from "react";
import type { EventCategory } from "@/types/environment";
import { CATEGORY_LABELS } from "@/types/environment";
import { getEventColor, USER_MARKER_COLOR } from "@/lib/globe/event-visuals";
import { HelpCircle, X } from "lucide-react";

// ============================================================
// GlobeLegend — Collapsible marker legend, tucked in corner
// ============================================================

const CATEGORY_KEYS: EventCategory[] = [
  "wildfire", "severe-storm", "volcano", "flood",
  "drought", "dust-haze", "landslide", "sea-lake-ice", "other",
];

export default function GlobeLegend() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed", bottom: 16, left: 16, zIndex: 25,
          width: 34, height: 34, borderRadius: 8,
          border: "1px solid var(--color-border)",
          background: "var(--color-bg-glass)",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        aria-label={open ? "Close legend" : "Open legend"}
        title="Marker legend"
      >
        {open ? <X size={15} strokeWidth={1.5} /> : <HelpCircle size={15} strokeWidth={1.5} />}
      </button>

      {/* Legend panel */}
      {open && (
        <div
          style={{
            position: "fixed", bottom: 60, left: 16, zIndex: 25,
            background: "var(--color-bg-panel)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid var(--color-border)",
            borderRadius: 10, padding: "10px 14px",
            fontSize: 10, color: "var(--color-text-secondary)",
            maxWidth: 200, userSelect: "none",
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-muted)", marginBottom: 8 }}>
            Marker Legend
          </div>

          {CATEGORY_KEYS.map((cat) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: getEventColor(cat), flexShrink: 0 }} />
              <span>{CATEGORY_LABELS[cat]}</span>
            </div>
          ))}

          <div style={{ height: 1, background: "var(--color-border)", margin: "6px 0" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid #F4F7FB", flexShrink: 0 }} />
            <span>Selected event</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: USER_MARKER_COLOR, flexShrink: 0 }} />
            <span>Your location</span>
          </div>

          <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: 4, opacity: 0.6 }}>
            Size reflects hotspot score. Not an official warning.
          </div>
        </div>
      )}
    </>
  );
}
