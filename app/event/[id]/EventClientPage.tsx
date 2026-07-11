"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type { EnvironmentalEvent, UserLocation } from "@/types/environment";
import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_COLORS_HEX } from "@/types/environment";
import { computeImportance, type ImportanceResult } from "@/lib/scoring/importance";
import { haversineDistance } from "@/lib/geo/distance";
import { formatRelativeTime, formatTimestamp } from "@/lib/formatting/date";
import { ArrowLeft, ExternalLink, MapPin, Calendar, Activity, Gauge, TrendingUp, Share2 } from "lucide-react";
import Link from "next/link";

// Lazy-load the small map
const EventMiniMap = dynamic(() => import("./EventMiniMap"), { ssr: false });

// ============================================================
// Types
// ============================================================

type EventApiResponse = {
  event: EnvironmentalEvent;
  metadata: { source: string; fetchedAt: string };
};

type LocationResponse = UserLocation & { source: string };

// ============================================================
// Helpers
// ============================================================

const TIER_COLORS: Record<ImportanceResult["tier"], string> = {
  critical: "#E53E3E",
  high: "#F08C3E",
  medium: "#F5D547",
  low: "#3BD5FF",
};

const TIER_LABELS: Record<ImportanceResult["tier"], string> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

// ============================================================
// Main Client Component
// ============================================================

export default function EventClientPage({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EnvironmentalEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ source: string; fetchedAt: string } | null>(null);

  // User location (from Vercel headers)
  const [userLoc, setUserLoc] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [copied, setCopied] = useState(false);

  // Fetch event data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/event/${eventId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Not found" }));
          if (!cancelled) setError(err.message ?? "Event not found");
          return;
        }
        const data: EventApiResponse = await res.json();
        if (!cancelled) {
          setEvent(data.event);
          setMetadata(data.metadata);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [eventId]);

  // Fetch user location
  useEffect(() => {
    let cancelled = false;
    fetch("/api/location")
      .then((r) => r.json())
      .then((d: LocationResponse) => {
        if (!cancelled && d.latitude != null && d.longitude != null) {
          setUserLoc({ lat: d.latitude, lng: d.longitude });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Compute importance
  const importance = useMemo(() => {
    if (!event) return null;
    return computeImportance({
      event,
      userLat: userLoc.lat,
      userLng: userLoc.lng,
    });
  }, [event, userLoc]);

  // Distance
  const distanceKm = useMemo(() => {
    if (!event || userLoc.lat == null || userLoc.lng == null) return null;
    return haversineDistance(userLoc.lat, userLoc.lng, event.latitude, event.longitude);
  }, [event, userLoc]);

  // Share
  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/event/${eventId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [eventId]);

  // ============================================================
  // Loading
  // ============================================================
  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: "#05070D", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(59, 213, 255, 0.2)", borderTopColor: "#3BD5FF", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "#8D9AAF", fontSize: 13 }}>Loading event data...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ============================================================
  // Error / Not Found
  // ============================================================
  if (error || !event) {
    return (
      <div style={{ minHeight: "100dvh", background: "#05070D", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "#e0e6f0", padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Event Not Found</h1>
        <p style={{ color: "#8D9AAF", fontSize: 14 }}>{error ?? "This event may have been closed or removed."}</p>
        <Link href="/" style={{ color: "#3BD5FF", textDecoration: "none", fontSize: 14, marginTop: 8 }}>
          ← Back to Planet Pulse
        </Link>
      </div>
    );
  }

  const tierInfo = importance ? {
    color: TIER_COLORS[importance.tier],
    label: TIER_LABELS[importance.tier],
  } : { color: "#3BD5FF", label: "—" };

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg, #05070D 0%, #0a1226 100%)", color: "#e0e6f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .event-card {
          background: rgba(15, 25, 45, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(59, 213, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
        }
      `}</style>

      {/* ============ HEADER ============ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(5, 7, 13, 0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(59, 213, 255, 0.1)",
        padding: "10px 20px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <Link href="/" style={{ color: "#8D9AAF", display: "flex", alignItems: "center", gap: 4, textDecoration: "none", fontSize: 13 }}>
          <ArrowLeft size={14} /> Planet Pulse
        </Link>
        <div style={{ flex: 1 }} />
        <button onClick={handleShare}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(59, 213, 255, 0.2)", background: "rgba(59, 213, 255, 0.06)", color: "#3BD5FF", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
          <Share2 size={12} /> {copied ? "Copied!" : "Share"}
        </button>
        <a href={event.sourceUrl ?? "#"} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#8D9AAF", textDecoration: "none", fontSize: 12 }}>
          <ExternalLink size={12} /> Source
        </a>
      </header>

      {/* ============ HERO ============ */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        {/* Category + Tier */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, background: `${CATEGORY_COLORS[event.category]}20`, color: CATEGORY_COLORS[event.category], border: `1px solid ${CATEGORY_COLORS[event.category]}40`, fontWeight: 600 }}>
            {CATEGORY_LABELS[event.category]}
          </span>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, background: `${tierInfo.color}15`, color: tierInfo.color, border: `1px solid ${tierInfo.color}30`, fontWeight: 700, letterSpacing: "0.05em" }}>
            {tierInfo.label}
          </span>
          {importance && (
            <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), monospace", color: tierInfo.color }}>
              {importance.score}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", lineHeight: 1.3 }}>
          {event.title}
        </h1>

        {/* Meta row */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#6B7B95", marginBottom: 24 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Calendar size={12} />
            {event.updatedAt ? formatRelativeTime(event.updatedAt) : "Unknown time"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin size={12} />
            {event.latitude.toFixed(2)}°N, {event.longitude.toFixed(2)}°E
          </span>
          {distanceKm != null && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: distanceKm < 250 ? "#F08C3E" : "#6B7B95" }}>
              <Activity size={12} />
              {Math.round(distanceKm).toLocaleString()} km from you
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            Source: {event.sourceName}
          </span>
        </div>

        {/* ============ SCORE CARDS ============ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
          {/* Hotspot Score */}
          <div className="event-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6B7B95", marginBottom: 4 }}>Hotspot Score</div>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), monospace", color: event.hotspotScore > 70 ? "#E53E3E" : event.hotspotScore > 40 ? "#F08C3E" : "#3BD5FF" }}>
              {event.hotspotScore}
            </div>
            <div style={{ fontSize: 10, color: "#6B7B95" }}>/ 100</div>
          </div>

          {/* Personal Relevance */}
          <div className="event-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6B7B95", marginBottom: 4 }}>Your Relevance</div>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), monospace", color: importance && importance.personalScore > 70 ? "#E53E3E" : importance && importance.personalScore > 40 ? "#F08C3E" : "#3BD5FF" }}>
              {importance?.personalScore ?? "—"}
            </div>
            <div style={{ fontSize: 10, color: "#6B7B95" }}>{userLoc.lat ? "/ 100" : "no location"}</div>
          </div>

          {/* Importance Score */}
          <div className="event-card" style={{ textAlign: "center", border: `1px solid ${tierInfo.color}30` }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: tierInfo.color, marginBottom: 4 }}>Importance</div>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), monospace", color: tierInfo.color }}>
              {importance?.score ?? event.hotspotScore}
            </div>
            <div style={{ fontSize: 10, color: "#6B7B95" }}>weighted</div>
          </div>

          {/* Magnitude */}
          <div className="event-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6B7B95", marginBottom: 4 }}>Magnitude</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), monospace", color: "#e0e6f0" }}>
              {event.magnitudeValue != null ? event.magnitudeValue : "—"}
            </div>
            <div style={{ fontSize: 10, color: "#6B7B95" }}>{event.magnitudeUnit ?? "no data"}</div>
          </div>
        </div>

        {/* ============ MAP ============ */}
        <div style={{ height: 320, borderRadius: 12, overflow: "hidden", marginBottom: 24, border: "1px solid rgba(59, 213, 255, 0.1)" }}>
          <EventMiniMap
            lat={event.latitude}
            lng={event.longitude}
            category={event.category}
            observations={event.observations}
          />
        </div>

        {/* ============ SCORE EXPLANATION ============ */}
        <div className="event-card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={14} style={{ color: "#3BD5FF" }} />
            Score Breakdown
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(importance?.explanation ?? event.scoreExplanation).map((line, i) => (
              <div key={i} style={{ fontSize: 12, color: "#8D9AAF", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#3BD5FF" }}>•</span> {line}
              </div>
            ))}
          </div>
        </div>

        {/* ============ SPLIT: Timeline + Metadata ============ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Observation Timeline */}
          <div className="event-card">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={14} style={{ color: "#F5D547" }} />
              Observation History
              <span style={{ fontSize: 11, color: "#6B7B95", fontWeight: 400, marginLeft: 4 }}>
                ({event.observations?.length ?? 0})
              </span>
            </h2>
            {event.observations && event.observations.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
                {event.observations.slice().reverse().slice(0, 20).map((obs, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.02)", fontSize: 11 }}>
                    <span style={{ color: "#6B7B95", flexShrink: 0, width: 80 }}>
                      {obs.observedAt ? formatTimestamp(obs.observedAt) : "Unknown"}
                    </span>
                    <span style={{ color: "#8D9AAF", flexShrink: 0 }}>
                      {obs.latitude.toFixed(2)}°N, {obs.longitude.toFixed(2)}°E
                    </span>
                    {obs.magnitudeValue != null && (
                      <span style={{ color: "#3BD5FF", flexShrink: 0 }}>
                        {obs.magnitudeValue}{obs.magnitudeUnit ? ` ${obs.magnitudeUnit}` : ""}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "#6B7B95" }}>No observation history available.</p>
            )}
          </div>

          {/* Event Metadata */}
          <div className="event-card">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
              <Gauge size={14} style={{ color: "#9B7BFF" }} />
              Event Details
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6B7B95" }}>Geometry Type</span>
                <span style={{ color: "#e0e6f0", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{event.geometryType}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6B7B95" }}>Started</span>
                <span style={{ color: "#e0e6f0" }}>{event.startedAt ? formatTimestamp(event.startedAt) : "Unknown"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6B7B95" }}>Last Updated</span>
                <span style={{ color: "#e0e6f0" }}>{event.updatedAt ? formatTimestamp(event.updatedAt) : "Unknown"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6B7B95" }}>Source</span>
                <a href={event.sourceUrl ?? "#"} target="_blank" rel="noopener noreferrer"
                  style={{ color: "#3BD5FF", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                  {event.sourceName} <ExternalLink size={10} />
                </a>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6B7B95" }}>Data Source</span>
                <span style={{ color: "#e0e6f0" }}>{metadata?.source ?? "—"}</span>
              </div>
              {metadata && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6B7B95" }}>Fetched At</span>
                  <span style={{ color: "#6B7B95", fontSize: 10 }}>{formatTimestamp(metadata.fetchedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============ FOOTER ============ */}
        <footer style={{ textAlign: "center", marginTop: 32, paddingTop: 16, borderTop: "1px solid rgba(59, 213, 255, 0.08)", fontSize: 10, color: "#6B7B95", lineHeight: 1.8 }}>
          <p style={{ margin: 0 }}>Data from NASA EONET. Planet Pulse is not an official NASA product.</p>
          <p style={{ margin: "4px 0 0" }}>Copyright © 2026 John Zhou | <Link href="/" style={{ color: "#3BD5FF", textDecoration: "none" }}>Planet Pulse</Link></p>
        </footer>
      </div>

      {/* ============ RESPONSIVE ============ */}
      <style>{`
        @media (max-width: 640px) {
          .event-card-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
