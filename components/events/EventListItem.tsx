"use client";
import React from "react";
import type { EnvironmentalEvent } from "@/types/environment";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/types/environment";
import { formatRelativeTime } from "@/lib/formatting/date";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventListItemProps = {
  event: EnvironmentalEvent;
  rank?: number;
  isSelected: boolean;
  onClick: () => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score > 70) return "var(--color-success)";
  if (score > 40) return "var(--color-warning)";
  return "var(--color-text-secondary)";
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  button: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.625rem",
    width: "100%",
    padding: "0.75rem 0.875rem",
    border: "none",
    background: "none",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-sans)",
    fontSize: 13,
    lineHeight: 1.45,
    cursor: "pointer",
    textAlign: "left" as const,
    borderRadius: 10,
    transition:
      "background 0.15s var(--ease-out-smooth), border-color 0.15s var(--ease-out-smooth)",
    borderLeft: "3px solid transparent",
    outline: "none",
  },
  rank: {
    fontFamily: "var(--font-mono)",
    fontSize: 15,
    fontWeight: 500,
    color: "var(--color-text-muted)",
    minWidth: 24,
    textAlign: "right" as const,
    flexShrink: 0,
    lineHeight: 1.3,
    paddingTop: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 5,
  },
  content: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
  },
  titleRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.5rem",
  },
  title: {
    fontSize: 13,
    lineHeight: 1.35,
    margin: 0,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontWeight: 500,
  },
  titleSelected: {
    fontWeight: 600,
    color: "var(--color-text-primary)",
  },
  score: {
    fontFamily: "var(--font-mono)",
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
    lineHeight: 1.3,
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: 11,
    color: "var(--color-text-muted)",
  },
  categoryLabel: {
    fontWeight: 500,
  },
  separator: {
    width: 3,
    height: 3,
    borderRadius: "50%",
    background: "var(--color-text-muted)",
    flexShrink: 0,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventListItem({
  event,
  rank,
  isSelected,
  onClick,
}: EventListItemProps) {
  const dotColor = CATEGORY_COLORS[event.category];
  const categoryLabel = CATEGORY_LABELS[event.category];
  const relativeTime = event.updatedAt
    ? formatRelativeTime(event.updatedAt)
    : "Unknown";

  const ariaLabel = `${event.title}, ${categoryLabel}${
    rank !== undefined ? `, rank ${rank}` : ""
  }`;

  return (
    <button
      type="button"
      style={{
        ...styles.button,
        ...(isSelected
          ? {
              background: "rgba(69, 163, 255, 0.08)",
              borderLeftColor: "var(--color-location)",
            }
          : {}),
      }}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-current={isSelected ? "true" : undefined}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,0.04)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLButtonElement).style.background = "none";
        }
      }}
      onFocus={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.boxShadow = "0 0 0 2px var(--color-location)";
      }}
      onBlur={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.boxShadow = "none";
      }}
    >
      {/* Rank */}
      {rank !== undefined && <span style={styles.rank}>{rank}</span>}

      {/* Category dot */}
      <div style={{ ...styles.dot, backgroundColor: dotColor }} />

      {/* Content */}
      <div style={styles.content}>
        {/* Title row */}
        <div style={styles.titleRow}>
          <span
            style={{
              ...styles.title,
              ...(isSelected ? styles.titleSelected : {}),
            }}
          >
            {event.title}
          </span>
          <span
            style={{
              ...styles.score,
              color: scoreColor(event.hotspotScore),
            }}
          >
            {event.hotspotScore}
          </span>
        </div>

        {/* Meta row */}
        <div style={styles.meta}>
          <span style={styles.categoryLabel}>{categoryLabel}</span>
          <span style={styles.separator} />
          <span>{relativeTime}</span>
        </div>
      </div>
    </button>
  );
}
