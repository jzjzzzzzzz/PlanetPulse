"use client";
import React from "react";
import { CATEGORY_COLORS, type EventCategory } from "@/types/environment";

// ---------------------------------------------------------------------------
// Abbreviated labels
// ---------------------------------------------------------------------------

const ABBREVIATIONS: Record<EventCategory, string> = {
  wildfire: "FIRE",
  "severe-storm": "STORM",
  volcano: "VOLC",
  flood: "FLOOD",
  drought: "DRY",
  "dust-haze": "DUST",
  landslide: "SLIDE",
  "sea-lake-ice": "ICE",
  other: "OTHER",
};

/** Display order for the legend items. */
const ORDER: EventCategory[] = [
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-start",
    gap: "0.25rem",
  },
  label: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "var(--color-text-muted)",
    lineHeight: 1,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap" as const,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },
  name: {
    fontSize: 9,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "var(--color-text-secondary)",
    lineHeight: 1,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventLegend() {
  return (
    <div className="hidden lg:flex" style={styles.wrapper}>
      <span style={styles.label}>Legend</span>
      <div style={styles.row}>
        {ORDER.map((cat) => (
          <div key={cat} style={styles.item}>
            <div
              style={{
                ...styles.dot,
                backgroundColor: CATEGORY_COLORS[cat],
              }}
            />
            <span style={styles.name}>{ABBREVIATIONS[cat]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
