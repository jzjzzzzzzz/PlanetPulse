"use client";

import React, { useMemo } from "react";
import type { EnvironmentalEvent, EventObservation } from "@/types/environment";
import { getEventColor } from "@/lib/globe/event-visuals";

type TimelineProps = {
  event: EnvironmentalEvent | null;
  onJumpTo: (obs: EventObservation) => void;
};

export default function ObservationTimeline({ event, onJumpTo }: TimelineProps) {
  const validObs = useMemo(() => {
    if (!event?.observations) return [];
    return event.observations.filter(
      (o) => o.observedAt && !Number.isNaN(new Date(o.observedAt).getTime()),
    );
  }, [event]);

  if (!event || validObs.length < 2) return null;

  const color = getEventColor(event.category);
  const latest = validObs[validObs.length - 1];

  return (
    <div
      style={{
        position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
        zIndex: 30, maxWidth: "90vw",
        background: "var(--color-bg-panel)", backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)", border: "1px solid var(--color-border)",
        borderRadius: 12, padding: "10px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
        <span style={{ color: "var(--color-text-secondary)", fontSize: 11, fontWeight: 600 }}>
          Observed History
        </span>
        <span style={{ color: "var(--color-text-muted)", fontSize: 10 }}>
          {validObs.length} observations · latest: {formatObsTime(latest)}
        </span>
      </div>

      {/* Timeline dots */}
      <div style={{ display: "flex", alignItems: "center", gap: 3, overflowX: "auto", paddingBottom: 4 }}>
        {validObs.map((obs, i) => {
          const isLatest = i === validObs.length - 1;
          return (
            <button
              key={i}
              onClick={() => onJumpTo(obs)}
              title={formatObsTime(obs)}
              style={{
                width: isLatest ? 10 : 6,
                height: isLatest ? 10 : 6,
                borderRadius: "50%",
                background: isLatest ? color : `${color}55`,
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            />
          );
        })}
        <span style={{ fontSize: 9, color: "var(--color-text-muted)", marginLeft: 6, whiteSpace: "nowrap" }}>
          {formatObsTime(validObs[0])} → {formatObsTime(latest)}
        </span>
      </div>

      <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: 4, opacity: 0.5 }}>
        Not a forecast or prediction — observed positions only
      </div>
    </div>
  );
}

function formatObsTime(obs: EventObservation): string {
  if (!obs.observedAt) return "?";
  const d = new Date(obs.observedAt);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
