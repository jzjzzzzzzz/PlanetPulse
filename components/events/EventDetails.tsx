"use client";
import React from "react";
import { X, Crosshair, ExternalLink } from "lucide-react";
import type { EnvironmentalEvent } from "@/types/environment";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/types/environment";
import { formatRelativeTime, formatTimestamp } from "@/lib/formatting/date";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventDetailsProps = {
  event: EnvironmentalEvent | null;
  distanceKm: number | null;
  onFocusGlobe: () => void;
  onClose: () => void;
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
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    padding: "1rem",
    pointerEvents: "none",
  },
  panel: {
    pointerEvents: "auto",
    width: "100%",
    maxWidth: 380,
    maxHeight: "calc(100dvh - 2rem)",
    overflowY: "auto",
    background: "var(--color-bg-panel)",
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    border: "1px solid var(--color-border)",
    borderRadius: 16,
    padding: "1.25rem",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-sans)",
    fontSize: 13,
    lineHeight: 1.6,
    boxShadow: "0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.625rem",
    marginBottom: "1rem",
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 4,
  },
  categoryBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
    marginBottom: "0.25rem",
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "var(--color-text-secondary)",
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1.35,
    margin: 0,
    color: "var(--color-text-primary)",
  },
  headerText: {
    flex: 1,
  },
  closeBtn: {
    flexShrink: 0,
    background: "none",
    border: "none",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    padding: 4,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.15s var(--ease-out-smooth)",
  },
  section: {
    marginBottom: "1rem",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "var(--color-text-muted)",
    marginBottom: "0.375rem",
  },
  hotspotScore: {
    fontFamily: "var(--font-mono)",
    fontSize: 36,
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: "-0.02em",
  },
  scoreExplainer: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
    marginTop: "0.5rem",
  },
  explainerItem: {
    fontSize: 11,
    color: "var(--color-text-muted)",
    lineHeight: 1.45,
    paddingLeft: "1em",
    textIndent: "-1em",
    paddingRight: "0.5rem",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.625rem",
  },
  detailItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.125rem",
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "var(--color-text-muted)",
  },
  detailValue: {
    fontSize: 12,
    color: "var(--color-text-primary)",
    wordBreak: "break-word" as const,
  },
  sourceLink: {
    color: "var(--color-location)",
    textDecoration: "none",
    fontSize: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    transition: "opacity 0.15s var(--ease-out-smooth)",
  },
  actions: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.75rem",
    paddingTop: "0.75rem",
    borderTop: "1px solid var(--color-border)",
  },
  actionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    padding: "0.5rem 0.875rem",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 500,
    border: "1px solid var(--color-border)",
    background: "rgba(255,255,255,0.04)",
    color: "var(--color-text-primary)",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
    transition: "background 0.15s var(--ease-out-smooth), border-color 0.15s var(--ease-out-smooth)",
    lineHeight: 1,
  },
  actionBtnPrimary: {
    background: "rgba(69, 163, 255, 0.12)",
    borderColor: "rgba(69, 163, 255, 0.3)",
  },
  firmsBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    padding: "0.25rem 0.5rem",
    borderRadius: 8,
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    background: "rgba(255, 107, 53, 0.12)",
    color: "var(--color-wildfire)",
    border: "1px solid rgba(255, 107, 53, 0.25)",
  },
  divider: {
    height: 1,
    background: "var(--color-border)",
    margin: "0.5rem 0",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventDetails({
  event,
  distanceKm,
  onFocusGlobe,
  onClose,
}: EventDetailsProps) {
  if (!event) return null;

  const dotColor = CATEGORY_COLORS[event.category];
  const categoryLabel = CATEGORY_LABELS[event.category];
  const relativeTime = event.updatedAt
    ? formatRelativeTime(event.updatedAt)
    : null;
  const absoluteTime = event.updatedAt
    ? formatTimestamp(event.updatedAt)
    : null;
  const isWildfire = event.category === "wildfire";

  return (
    <div style={styles.overlay}>
      <div style={styles.panel} role="dialog" aria-label={`Event details: ${event.title}`}>
        {/* ---- Header ---- */}
        <div style={styles.header}>
          <div style={styles.headerText}>
            <div style={styles.categoryBadge}>
              <div
                style={{ ...styles.categoryDot, backgroundColor: dotColor }}
              />
              <span style={styles.categoryLabel}>{categoryLabel}</span>
            </div>
            <h3 style={styles.title}>{event.title}</h3>
          </div>
          <button
            style={styles.closeBtn}
            onClick={onClose}
            aria-label="Close event details"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--color-text-muted)";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ---- Hotspot Score ---- */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Hotspot Score</div>
          <div
            style={{
              ...styles.hotspotScore,
              color: scoreColor(event.hotspotScore),
            }}
          >
            {event.hotspotScore}
          </div>
          {event.scoreExplanation.length > 0 && (
            <ul style={styles.scoreExplainer}>
              {event.scoreExplanation.map((item, idx) => (
                <li key={idx} style={styles.explainerItem}>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---- FIRMS badge ---- */}
        {isWildfire && (
          <div style={{ marginBottom: "0.75rem" }}>
            <span style={styles.firmsBadge}>
              <span style={{ fontSize: 11, lineHeight: 1 }}>&#128293;</span>
              Detailed fire detections available
            </span>
          </div>
        )}

        {/* ---- Details Grid ---- */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Details</div>
          <div style={styles.detailsGrid}>
            {/* Last observation */}
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Last Observed</span>
              <span style={styles.detailValue}>
                {relativeTime ?? "Unknown"}
                {absoluteTime && (
                  <>
                    <br />
                    <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>
                      {absoluteTime}
                    </span>
                  </>
                )}
              </span>
            </div>

            {/* Start time */}
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Start Time</span>
              <span style={styles.detailValue}>
                {event.startedAt ? formatTimestamp(event.startedAt) : "N/A"}
              </span>
            </div>

            {/* Coordinates */}
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Coordinates</span>
              <span
                style={{
                  ...styles.detailValue,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                }}
              >
                {event.latitude.toFixed(3)}, {event.longitude.toFixed(3)}
              </span>
            </div>

            {/* Distance */}
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Distance</span>
              <span style={styles.detailValue}>
                {distanceKm !== null
                  ? `${distanceKm.toFixed(0)} km`
                  : "N/A"}
              </span>
            </div>

            {/* Source name */}
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Source</span>
              <span style={styles.detailValue}>{event.sourceName}</span>
            </div>

            {/* Source link */}
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Source Link</span>
              <span style={styles.detailValue}>
                {event.sourceUrl ? (
                  <a
                    href={event.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.sourceLink}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.opacity =
                        "0.8";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.opacity =
                        "1";
                    }}
                  >
                    View source <ExternalLink size={11} />
                  </a>
                ) : (
                  "N/A"
                )}
              </span>
            </div>
          </div>
        </div>

        {/* ---- Actions ---- */}
        <div style={styles.actions}>
          <button
            style={{ ...styles.actionBtn, ...styles.actionBtnPrimary }}
            onClick={onFocusGlobe}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "rgba(69, 163, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "rgba(69, 163, 255, 0.12)";
            }}
          >
            <Crosshair size={14} />
            Focus on globe
          </button>

          {event.sourceUrl && (
            <button
              style={styles.actionBtn}
              onClick={() =>
                window.open(event.sourceUrl!, "_blank", "noopener,noreferrer")
              }
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = "rgba(255,255,255,0.08)";
                el.style.borderColor = "var(--color-border-hover)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = "rgba(255,255,255,0.04)";
                el.style.borderColor = "var(--color-border)";
              }}
            >
              <ExternalLink size={14} />
              View source
            </button>
          )}

          <button
            style={{ ...styles.actionBtn, marginLeft: "auto" }}
            onClick={onClose}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "rgba(255,255,255,0.04)";
            }}
          >
            <X size={14} />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
