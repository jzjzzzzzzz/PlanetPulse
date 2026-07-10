"use client";

import React, { useState, useEffect } from "react";
import { Satellite } from "lucide-react";

type EpicData = {
  source: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  date?: string;
  caption?: string;
};

export default function EpicSatellite() {
  const [data, setData] = useState<EpicData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/epic")
      .then((r) => r.json())
      .then((d) => { if (d.source === "live") setData(d); })
      .catch(() => {});
  }, []);

  if (!data?.thumbnailUrl) return null;

  return (
    <div
      style={{
        position: "fixed", top: 56, right: 290, zIndex: 30,
      }}
    >
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          style={{
            width: 40, height: 40, borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-glass)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          title="NASA EPIC satellite image"
        >
          <Satellite size={16} strokeWidth={1.5} />
        </button>
      ) : (
        <div
          style={{
            background: "var(--color-bg-panel)",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            border: "1px solid var(--color-border)", borderRadius: 10,
            padding: 8, width: 220,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)" }}>
              🛰️ NASA EPIC
            </span>
            <button
              onClick={() => setExpanded(false)}
              style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          <img
            src={data.thumbnailUrl}
            alt="NASA EPIC Earth image"
            style={{ width: "100%", borderRadius: 6, display: "block" }}
            loading="lazy"
          />
          <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: 4, textAlign: "center" }}>
            {data.date ? new Date(data.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
          </div>
          {data.caption && (
            <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: 2, opacity: 0.7 }}>
              {data.caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
