"use client";
import React, { useMemo } from "react";
import type { EnvironmentalEvent } from "@/types/environment";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/types/environment";
import { TrendingUp, ExternalLink } from "lucide-react";
import Link from "next/link";

type HotspotPanelProps = {
  events: EnvironmentalEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: EnvironmentalEvent) => void;
};

/** Returns a relative time string e.g. "6h ago", "2d ago" */
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

export default function HotspotPanel({
  events,
  selectedEventId,
  onSelectEvent,
}: HotspotPanelProps) {
  const topEvents = useMemo(() => {
    return [...events].sort((a, b) => b.hotspotScore - a.hotspotScore).slice(0, 8);
  }, [events]);

  return (
    <aside
      className="hidden lg:block fixed right-3 z-10 overflow-y-auto"
      style={{
        top: "56px",
        maxHeight: "calc(100dvh - 56px - 100px)",
        width: "260px",
        backgroundColor: "var(--color-bg-panel)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid var(--color-border)`,
        borderRadius: "12px",
        padding: "14px",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={13} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />
        <span
          className="text-[10px] tracking-[0.15em] uppercase font-semibold"
          style={{ color: "var(--color-text-muted)" }}
        >
          GLOBAL HOTSPOTS
        </span>
      </div>

      {topEvents.length === 0 && (
        <p
          className="text-xs py-4 text-center"
          style={{ color: "var(--color-text-muted)" }}
        >
          No events loaded yet.
        </p>
      )}

      <ul className="space-y-1">
        {topEvents.map((event, index) => {
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
                className="w-full flex items-start gap-2 px-2 py-2 rounded-md text-left transition-colors duration-150 cursor-pointer"
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
                  className="flex-shrink-0 text-lg font-bold tabular-nums leading-none mt-0.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-text-secondary)",
                    opacity: 0.7,
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Category badge */}
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
                      className="text-[10px] uppercase tracking-wide font-medium truncate"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {CATEGORY_LABELS[event.category]}
                    </span>
                  </div>

                  {/* Title */}
                  <p
                    className="text-xs leading-tight line-clamp-2"
                    style={{
                      color: isSelected
                        ? "var(--color-text-primary)"
                        : "var(--color-text-secondary)",
                    }}
                  >
                    {event.title}
                  </p>

                  {/* Meta row: time + score */}
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span
                      className="text-[10px] whitespace-nowrap"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {relativeTime(event.updatedAt)}
                    </span>
                    <span
                      className="text-[10px] font-medium tabular-nums whitespace-nowrap"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: scoreColor,
                      }}
                    >
                      {Math.round(score)}
                    </span>
                    <Link
                      href={`/event/${event.id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "var(--color-text-muted)", display: "flex", alignItems: "center" }}
                      title="View event details"
                    >
                      <ExternalLink size={10} strokeWidth={1.5} />
                    </Link>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
