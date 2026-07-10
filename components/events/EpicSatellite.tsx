"use client";

import React, { useState, useEffect } from "react";
import { Map, X } from "lucide-react";

type Props = { lat?: number | null; lng?: number | null };

export default function EpicSatellite({ lat, lng }: Props) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) return;
    setLoading(true);
    setImgSrc(null);
    // Use direct proxy — /api/satellite returns the image
    const src = `/api/satellite?lat=${lat.toFixed(2)}&lng=${lng.toFixed(2)}`;
    setImgSrc(src);
    setLoading(false);
  }, [lat, lng]);

  const hasCoords = lat != null && lng != null;

  return (
    <div style={{ position: "fixed", top: 8, left: 160, zIndex: 100 }}>
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          style={{
            width: 34, height: 34, borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-glass)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            color: hasCoords ? "var(--color-location)" : "var(--color-text-muted)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          title="NASA MODIS satellite view"
        >
          <Map size={15} strokeWidth={1.5} />
        </button>
      ) : (
        <div style={{
          background: "var(--color-bg-panel)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          border: "1px solid var(--color-border-hover)", borderRadius: 10, padding: 10, width: 320,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)" }}>
              🛰️ NASA MODIS Satellite
              {hasCoords && ` · ${lat!.toFixed(1)}°, ${lng!.toFixed(1)}°`}
            </span>
            <button onClick={() => setExpanded(false)} style={{
              background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer",
              fontSize: 16, lineHeight: 1, padding: 0,
            }}><X size={16} /></button>
          </div>

          {!hasCoords ? (
            <div style={{ color: "var(--color-text-muted)", fontSize: 12, textAlign: "center", padding: 24, lineHeight: 1.6 }}>
              Select an environmental event on the globe<br />
              to see real satellite imagery of that location.
            </div>
          ) : loading ? (
            <div style={{ color: "var(--color-text-muted)", fontSize: 12, textAlign: "center", padding: 24 }}>
              Loading satellite imagery...
            </div>
          ) : imgSrc ? (
            <>
              <img
                src={imgSrc}
                alt="Satellite view"
                style={{ width: "100%", borderRadius: 6, display: "block", background: "#0a1628" }}
                loading="lazy"
              />
              <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: 4, opacity: 0.5 }}>
                NASA GIBS · MODIS Terra true color · updated daily
              </div>
            </>
          ) : (
            <div style={{ color: "var(--color-warning)", fontSize: 12, textAlign: "center", padding: 16 }}>
              Satellite image temporarily unavailable.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
