"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type { EnvironmentalEvent, UserLocation } from "@/types/environment";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/types/environment";
import { computeImportance, type ImportanceResult } from "@/lib/scoring/importance";
import { haversineDistance } from "@/lib/geo/distance";
import { formatRelativeTime, formatTimestamp } from "@/lib/formatting/date";
import { ArrowLeft, ExternalLink, MapPin, Calendar, Activity, Gauge, TrendingUp, Share2, Wind } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/theme/useTheme";

const EventMiniMap = dynamic(() => import("./EventMiniMap"), { ssr: false });

// ============================================================
// Constants
// ============================================================

const TIER_COLORS: Record<ImportanceResult["tier"], string> = {
  critical: "#E53E3E", high: "#F08C3E", medium: "#F5D547", low: "#3BD5FF",
};
const TIER_LABELS: Record<ImportanceResult["tier"], string> = {
  critical: "CRITICAL", high: "HIGH", medium: "MEDIUM", low: "LOW",
};

// ============================================================
// Metric Card
// ============================================================

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 8px" }}>
      <div style={{ fontSize: 10, color: "var(--tp-text-muted, #6B7B95)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), monospace", color: accent ?? "var(--tp-text, #e0e6f0)", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--tp-text-muted, #6B7B95)", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function EventClientPage({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EnvironmentalEvent | null>(null);
  const { dark, colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ source: string; fetchedAt: string } | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [copied, setCopied] = useState(false);

  // Fix body overflow for scrolling
  useEffect(() => {
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    return () => { document.body.style.overflow = ""; document.body.style.height = ""; };
  }, []);

  // Fetch event
  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const res = await fetch(`/api/event/${eventId}`);
        if (!res.ok) { const e = await res.json().catch(() => ({ message: "Not found" })); if (!c) setError(e.message ?? "Event not found"); return; }
        const d = await res.json();
        if (!c) { setEvent(d.event); setMetadata(d.metadata); }
      } catch (err) { if (!c) setError((err as Error).message); }
      finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [eventId]);

  // Fetch location
  useEffect(() => {
    let c = false;
    fetch("/api/location").then(r => r.json()).then((d: UserLocation & { source: string }) => {
      if (!c && d.latitude != null && d.longitude != null) setUserLoc({ lat: d.latitude, lng: d.longitude });
    }).catch(() => {});
    return () => { c = true; };
  }, []);

  // Computed
  const importance = useMemo(() => event ? computeImportance({ event, userLat: userLoc.lat, userLng: userLoc.lng }) : null, [event, userLoc]);
  const distanceKm = useMemo(() => event && userLoc.lat != null ? haversineDistance(userLoc.lat, userLoc.lng!, event.latitude, event.longitude) : null, [event, userLoc]);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/event/${eventId}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  }, [eventId]);

  // ============================================================
  // Loading
  // ============================================================
  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 48, height: 48, border: "3px solid rgba(59, 213, 255, 0.2)", borderTopColor: "#3BD5FF", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ color: colors.textSecondary, fontSize: 14 }}>Loading event data...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ============================================================
  // Error
  // ============================================================
  if (error || !event) {
    return (
      <div style={{ minHeight: "100dvh", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: colors.text, padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Event Not Found</h1>
        <p style={{ color: colors.textSecondary, fontSize: 14 }}>{error ?? "This event may have been closed or removed."}</p>
        <Link href="/" style={{ color: colors.accent, textDecoration: "none", fontSize: 14, marginTop: 8 }}>← Back to Planet Pulse</Link>
      </div>
    );
  }

  const tierInfo = importance ? { color: TIER_COLORS[importance.tier], label: TIER_LABELS[importance.tier] } : { color: colors.accent, label: "—" };

  return (
    <div style={{ minHeight: "100dvh", background: colors.bg, color: colors.text, "--tp-bg-panel": colors.bgPanel, "--tp-border": colors.border, "--tp-text": colors.text, "--tp-text-muted": colors.textMuted, fontFamily: "system-ui, -apple-system, sans-serif" } as React.CSSProperties}>
      {/* ============ HEADER ============ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: colors.headerBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${colors.borderAccent}`,
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <Link href="/" style={{ color: colors.textSecondary, display: "flex", alignItems: "center", gap: 4, textDecoration: "none", fontSize: 12 }}>
          <ArrowLeft size={14} /> Planet Pulse
        </Link>
        <div style={{ flex: 1 }} />
        <button onClick={handleShare}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(59, 213, 255, 0.3)", background: "rgba(59, 213, 255, 0.08)", color: colors.accent, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
          <Share2 size={12} /> {copied ? "Copied!" : "Share"}
        </button>
        <a href={event.sourceUrl ?? "#"} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: colors.cardBg, color: colors.textSecondary, textDecoration: "none", fontSize: 11 }}>
          <ExternalLink size={12} /> Source
        </a>
      </header>

      {/* ============ CONTENT ============ */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px" }}>
        {/* Category + Tier badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${CATEGORY_COLORS[event.category]}18`, color: CATEGORY_COLORS[event.category], border: `1px solid ${CATEGORY_COLORS[event.category]}33`, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {CATEGORY_LABELS[event.category]}
          </span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${tierInfo.color}15`, color: tierInfo.color, border: `1px solid ${tierInfo.color}33`, fontWeight: 700, letterSpacing: "0.05em" }}>
            {tierInfo.label}
          </span>
          {importance && (
            <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), monospace", color: tierInfo.color }}>
              {importance.score}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
          {event.title}
        </h1>

        {/* Meta */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: colors.textMuted, marginBottom: 20 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} />{event.updatedAt ? formatRelativeTime(event.updatedAt) : "—"}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} />{event.latitude.toFixed(2)}°N, {event.longitude.toFixed(2)}°E</span>
          {distanceKm != null && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: distanceKm < 250 ? "#F08C3E" : "#6B7B95" }}>
              <Activity size={11} />{Math.round(distanceKm).toLocaleString()} km
            </span>
          )}
          <span>{event.sourceName}</span>
        </div>

        {/* ============ SCORE CARDS ============ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
          <MetricCard label="Hotspot" value={`${event.hotspotScore}`} sub="/ 100" accent={event.hotspotScore > 70 ? "#E53E3E" : event.hotspotScore > 40 ? "#F08C3E" : "#3BD5FF"} />
          <MetricCard label="Relevance" value={importance?.personalScore != null ? `${importance.personalScore}` : "—"} sub={userLoc.lat ? "/ 100" : "no loc"} accent={importance && importance.personalScore > 70 ? "#E53E3E" : importance && importance.personalScore > 40 ? "#F08C3E" : "#3BD5FF"} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 8px", borderRadius: 8, border: `1px solid ${tierInfo.color}33`, background: `${tierInfo.color}08` }}>
            <div style={{ fontSize: 10, color: tierInfo.color, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Importance</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), monospace", color: tierInfo.color, lineHeight: 1.2 }}>{importance?.score ?? event.hotspotScore}</div>
            <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>weighted</div>
          </div>
          <MetricCard label="Magnitude" value={event.magnitudeValue != null ? `${event.magnitudeValue}` : "—"} sub={event.magnitudeUnit ?? "no data"} />
        </div>

        {/* ============ MAP ============ */}
        <div style={{ height: 300, borderRadius: 12, overflow: "hidden", marginBottom: 20, border: `1px solid ${colors.border}` }}>
          <EventMiniMap lat={event.latitude} lng={event.longitude} category={event.category} observations={event.observations} />
        </div>

        {/* ============ PANELS GRID ============ */}
        <div className="event-panels" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Score Breakdown */}
          <div className="panel-card">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={14} style={{ color: colors.accent }} />Score Breakdown
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {(importance?.explanation ?? event.scoreExplanation).map((line, i) => (
                <div key={i} style={{ fontSize: 11, color: colors.textSecondary, display: "flex", gap: 6 }}>
                  <span style={{ color: colors.accent, flexShrink: 0 }}>•</span> {line}
                </div>
              ))}
            </div>
          </div>

          {/* Event Details */}
          <div className="panel-card">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
              <Gauge size={14} style={{ color: "#9B7BFF" }} />Event Details
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
              {[
                ["Geometry", event.geometryType],
                ["Started", event.startedAt ? formatTimestamp(event.startedAt) : "Unknown"],
                ["Updated", event.updatedAt ? formatTimestamp(event.updatedAt) : "Unknown"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.textMuted }}>{k}</span>
                  <span style={{ color: colors.text }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.textMuted }}>Source</span>
                <a href={event.sourceUrl ?? "#"} target="_blank" rel="noopener noreferrer" style={{ color: colors.accent, textDecoration: "none" }}>
                  {event.sourceName} <ExternalLink size={10} style={{ display: "inline" }} />
                </a>
              </div>
              {metadata && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: colors.textMuted }}>Data</span>
                    <span style={{ color: colors.text }}>{metadata.source}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: colors.textMuted }}>Fetched</span>
                    <span style={{ color: colors.textMuted, fontSize: 9 }}>{formatTimestamp(metadata.fetchedAt)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Observation Timeline */}
          <div className="panel-card" style={{ gridColumn: "1 / -1" }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={14} style={{ color: "#F5D547" }} />Observation History ({event.observations?.length ?? 0})
            </h2>
            {event.observations && event.observations.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
                {event.observations.slice().reverse().slice(0, 20).map((obs, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "5px 8px", borderRadius: 4, background: "rgba(255,255,255,0.015)", fontSize: 10, alignItems: "center" }}>
                    <span style={{ color: colors.textMuted, flexShrink: 0, width: 110, fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                      {obs.observedAt ? formatTimestamp(obs.observedAt) : "—"}
                    </span>
                    <span style={{ color: colors.textSecondary, flexShrink: 0, fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                      {obs.latitude.toFixed(2)}°, {obs.longitude.toFixed(2)}°
                    </span>
                    {obs.magnitudeValue != null && (
                      <span style={{ color: colors.accent, flexShrink: 0, fontWeight: 600 }}>
                        {obs.magnitudeValue}{obs.magnitudeUnit ?? ""}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>No observation history.</p>
            )}
          </div>
        </div>

        <ThemeToggle />

        {/* ============ FOOTER ============ */}
        <footer style={{ textAlign: "center", marginTop: 28, paddingTop: 14, borderTop: `1px solid ${colors.border}`, fontSize: 10, color: colors.textMuted, lineHeight: 1.8 }}>
          <p style={{ margin: 0 }}>Data from NASA EONET. Planet Pulse is not an official NASA product.</p>
          <p style={{ margin: "4px 0 0", opacity: 0.6 }}>Copyright © 2026 John Zhou | <Link href="/" style={{ color: colors.accent, textDecoration: "none" }}>Planet Pulse</Link></p>
        </footer>
      </div>

      {/* ============ STYLES ============ */}
      <style>{`
        .panel-card {
          background: colors.bgPanel;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(59, 213, 255, 0.12);
          border-radius: 12px;
          padding: 14px;
          overflow: hidden;
        }
        @media (max-width: 640px) {
          .event-panels { grid-template-columns: 1fr !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
