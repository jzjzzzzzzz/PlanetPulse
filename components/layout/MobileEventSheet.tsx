"use client";
import React, { useState, useMemo } from "react";
import type { EnvironmentalEvent, EventCategory } from "@/types/environment";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/types/environment";
import { ChevronUp, ChevronDown, Filter } from "lucide-react";

type MobileEventSheetProps = {
  events: EnvironmentalEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: EnvironmentalEvent) => void;
  selectedCategory: EventCategory | "all";
  onSelectCategory: (category: EventCategory | "all") => void;
};

const CATEGORY_ORDER: (EventCategory | "all")[] = [
  "all",
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

function relativeTime(isoString: string | null): string {
  if (!isoString) return "—";
  const now = Date.now();
  const then = new Date(isoString).getTime();
  if (isNaN(then)) return "—";

  const diffMs = now - then;
  if (diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function MobileEventSheet({
  events,
  selectedEventId,
  onSelectEvent,
  selectedCategory,
  onSelectCategory,
}: MobileEventSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const topEvents = useMemo(() => {
    return [...events].sort((a, b) => b.hotspotScore - a.hotspotScore);
  }, [events]);

  const visibleEvents = expanded ? topEvents : topEvents.slice(0, 3);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find((e) => e.id === selectedEventId) ?? null;
  }, [events, selectedEventId]);

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30"
      style={{
        maxHeight: expanded ? "80dvh" : "auto",
        overflowY: expanded ? "auto" : "visible",
        backgroundColor: "var(--color-bg-panel)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: `1px solid var(--color-border-hover)`,
        borderRadius: "16px 16px 0 0",
        transition: "max-height 0.3s var(--ease-out-smooth)",
      }}
    >
      {/* Drag handle */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex justify-center py-2 cursor-pointer"
        aria-label={expanded ? "Collapse sheet" : "Expand sheet"}
      >
        <span
          className="w-8 h-1 rounded-full"
          style={{ backgroundColor: "var(--color-border-hover)" }}
        />
      </button>

      {/* Header row */}
      <div className="flex items-center justify-between px-4 pb-2">
        <span
          className="text-[10px] tracking-[0.15em] uppercase font-semibold"
          style={{ color: "var(--color-text-muted)" }}
        >
          {expanded ? "GLOBAL HOTSPOTS" : "NEARBY SIGNALS"}
        </span>
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          {expanded && (
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className="p-1 rounded-md transition-colors"
              style={{
                color: showFilters
                  ? "var(--color-text-primary)"
                  : "var(--color-text-muted)",
                backgroundColor: showFilters
                  ? "var(--color-bg-panel-hover)"
                  : "transparent",
              }}
              aria-label="Toggle filters"
            >
              <Filter size={14} strokeWidth={1.5} />
            </button>
          )}
          {/* Expand/collapse icon */}
          {expanded ? (
            <ChevronDown
              size={14}
              strokeWidth={1.5}
              style={{ color: "var(--color-text-muted)" }}
            />
          ) : (
            <ChevronUp
              size={14}
              strokeWidth={1.5}
              style={{ color: "var(--color-text-muted)" }}
            />
          )}
        </div>
      </div>

      {/* Category filters — shown when expanded + toggled */}
      {expanded && showFilters && (
        <div
          className="mx-4 mb-2 p-2 rounded-lg"
          style={{
            backgroundColor: "var(--color-bg-glass)",
            border: `1px solid var(--color-border)`,
          }}
        >
          <div className="flex flex-wrap gap-1">
            {CATEGORY_ORDER.map((cat) => {
              const isAll = cat === "all";
              const label = isAll ? "All" : CATEGORY_LABELS[cat];
              const color = isAll
                ? "var(--color-text-secondary)"
                : CATEGORY_COLORS[cat];
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(cat)}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isSelected
                      ? "var(--color-bg-panel-hover)"
                      : "transparent",
                    border: isSelected
                      ? "1px solid var(--color-border-hover)"
                      : "1px solid var(--color-border)",
                    color: isSelected
                      ? "var(--color-text-primary)"
                      : "var(--color-text-secondary)",
                  }}
                >
                  <span
                    className="rounded-full flex-shrink-0"
                    style={{
                      width: "5px",
                      height: "5px",
                      backgroundColor: color,
                    }}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Event list */}
      <ul className="px-3 pb-3 space-y-0.5">
        {visibleEvents.map((event, index) => {
          const isSelected = event.id === selectedEventId;
          const score = event.hotspotScore;
          const scoreColor =
            score > 70
              ? "var(--color-success)"
              : score > 40
                ? "var(--color-warning)"
                : "var(--color-text-secondary)";

          return (
            <li key={event.id}>
              <button
                onClick={() => onSelectEvent(event)}
                className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer"
                style={{
                  backgroundColor: isSelected
                    ? "var(--color-bg-panel-hover)"
                    : "transparent",
                  border: isSelected
                    ? "1px solid var(--color-border-hover)"
                    : "1px solid transparent",
                }}
              >
                {/* Rank */}
                <span
                  className="flex-shrink-0 text-base font-bold tabular-nums leading-tight mt-0.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-text-secondary)",
                    opacity: 0.6,
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span
                      className="flex-shrink-0 rounded-full inline-block"
                      style={{
                        width: "6px",
                        height: "6px",
                        backgroundColor: CATEGORY_COLORS[event.category],
                      }}
                    />
                    <span
                      className="text-[10px] uppercase tracking-wide font-medium"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {CATEGORY_LABELS[event.category]}
                    </span>
                  </div>
                  <p
                    className="text-[13px] leading-snug line-clamp-2"
                    style={{
                      color: isSelected
                        ? "var(--color-text-primary)"
                        : "var(--color-text-secondary)",
                    }}
                  >
                    {event.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {relativeTime(event.updatedAt)}
                    </span>
                    <span
                      className="text-[10px] font-medium tabular-nums"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: scoreColor,
                      }}
                    >
                      {Math.round(score)}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Selected event detail — shown when expanded */}
      {expanded && selectedEvent && (
        <div
          className="mx-3 mb-3 p-3 rounded-lg"
          style={{
            backgroundColor: "var(--color-bg-glass)",
            border: `1px solid var(--color-border-hover)`,
          }}
        >
          <p
            className="text-[11px] tracking-[0.15em] uppercase font-semibold mb-2"
            style={{ color: "var(--color-text-muted)" }}
          >
            EVENT DETAIL
          </p>
          <h3
            className="text-sm font-medium mb-1.5"
            style={{ color: "var(--color-text-primary)" }}
          >
            {selectedEvent.title}
          </h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span
              className="text-[11px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Category:{" "}
              <span style={{ color: "var(--color-text-secondary)" }}>
                {CATEGORY_LABELS[selectedEvent.category]}
              </span>
            </span>
            <span
              className="text-[11px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Source:{" "}
              <span style={{ color: "var(--color-text-secondary)" }}>
                {selectedEvent.sourceName}
              </span>
            </span>
            <span
              className="text-[11px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Updated:{" "}
              <span style={{ color: "var(--color-text-secondary)" }}>
                {relativeTime(selectedEvent.updatedAt)}
              </span>
            </span>
          </div>
          {/* Coordinates */}
          <div
            className="mt-1.5 text-[10px]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-text-muted)",
            }}
          >
            {selectedEvent.latitude.toFixed(4)},{" "}
            {selectedEvent.longitude.toFixed(4)}
          </div>
          {/* Score explanation */}
          {selectedEvent.scoreExplanation.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {selectedEvent.scoreExplanation.map((reason, i) => (
                <p
                  key={i}
                  className="text-[10px] flex items-start gap-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <span style={{ color: "var(--color-text-secondary)" }}>-</span>
                  {reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {visibleEvents.length === 0 && (
        <p
          className="text-xs py-6 text-center"
          style={{ color: "var(--color-text-muted)" }}
        >
          No events loaded.
        </p>
      )}
    </div>
  );
}
