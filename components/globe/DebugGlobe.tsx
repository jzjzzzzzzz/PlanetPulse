"use client";

import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import GlobeGL from "react-globe.gl";
import { Plus, Minus, RotateCcw, MapPin, Play, Pause } from "lucide-react";
import type { EnvironmentalEvent } from "@/types/environment";
import { CATEGORY_COLORS_HEX } from "@/types/environment";

// ============================================================
// Types
// ============================================================

type MarkerData = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  size: number;
  title: string;
  isUser: boolean;
};

type Props = {
  events: EnvironmentalEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: EnvironmentalEvent | null) => void;
  userLat?: number | null;
  userLng?: number | null;
  nearestEvent?: EnvironmentalEvent | null;
  jumpToObs?: { lat: number; lng: number } | null;
};

// ============================================================
// Constants
// ============================================================

const MAX_MARKERS = 200;
const FALLBACK_COLOR = "#8D9AAF";
const USER_COLOR = "#45A3FF";

const btn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 32, height: 32, borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-bg-glass)",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  fontSize: 10, fontWeight: 600,
};

// ============================================================
// Component
// ============================================================

export default function DebugGlobe({
  events, selectedEventId, onSelectEvent, userLat, userLng, nearestEvent, jumpToObs,
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeEl = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const altRef = useRef(2.5);
  const rotRef = useRef(0);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const eventsRef = useRef(events);
  const onSelectRef = useRef(onSelectEvent);

  // Sync refs in effect, not during render
  useEffect(() => { eventsRef.current = events; }, [events]);
  useEffect(() => { onSelectRef.current = onSelectEvent; }, [onSelectEvent]);

  const handleReady = useCallback(() => setReady(true), []);

  // ---- Auto-rotation ----
  const startAutoRotate = useCallback(() => {
    if (animRef.current) return;
    animRef.current = setInterval(() => {
      rotRef.current = (rotRef.current + 0.15) % 360;
      try { globeEl.current?.pointOfView({ lng: rotRef.current }, 0); } catch { /* */ }
    }, 50);
    setAutoRotate(true);
  }, []);

  const stopAutoRotate = useCallback(() => {
    if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
    setAutoRotate(false);
  }, []);

  const toggleAutoRotate = useCallback(() => {
    if (autoRotate) stopAutoRotate(); else startAutoRotate();
  }, [autoRotate, startAutoRotate, stopAutoRotate]);

  useEffect(() => () => { if (animRef.current) clearInterval(animRef.current); }, []);

  // ---- Camera Controls ----
  const zoomIn = useCallback(() => {
    altRef.current = Math.max(0.8, altRef.current * 0.65);
    try { globeEl.current?.pointOfView({ altitude: altRef.current }, 400); } catch { /* */ }
  }, []);

  const zoomOut = useCallback(() => {
    altRef.current = Math.min(8.0, altRef.current * 1.5);
    try { globeEl.current?.pointOfView({ altitude: altRef.current }, 400); } catch { /* */ }
  }, []);

  const resetView = useCallback(() => {
    stopAutoRotate();
    altRef.current = 2.5;
    rotRef.current = 0;
    try { globeEl.current?.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 800); } catch { /* */ }
  }, [stopAutoRotate]);

  const focusUser = useCallback(() => {
    stopAutoRotate();
    if (nearestEvent) {
      onSelectRef.current(nearestEvent);
      altRef.current = 1.6;
      try { globeEl.current?.pointOfView({ lat: nearestEvent.latitude, lng: nearestEvent.longitude, altitude: 1.6 }, 800); } catch { /* */ }
    } else if (userLat != null && userLng != null) {
      altRef.current = 1.6;
      try { globeEl.current?.pointOfView({ lat: userLat, lng: userLng, altitude: 1.6 }, 800); } catch { /* */ }
    }
  }, [nearestEvent, userLat, userLng, stopAutoRotate]);

  // ---- Camera fly-to on selection ----
  useEffect(() => {
    if (!ready || !selectedEventId || !globeEl.current) return;
    const event = events.find((e) => e.id === selectedEventId);
    if (!event) return;
    // Stop rotation directly without setState
    if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
    const t = setTimeout(() => {
      altRef.current = 1.6;
      try { globeEl.current?.pointOfView({ lat: event.latitude, lng: event.longitude, altitude: 1.6 }, 800); } catch { /* */ }
    }, 100);
    return () => clearTimeout(t);
  }, [selectedEventId, events, ready]);

  // ---- Jump to observation position ----
  useEffect(() => {
    if (!ready || !jumpToObs || !globeEl.current) return;
    altRef.current = 1.6;
    try { globeEl.current?.pointOfView({ lat: jumpToObs.lat, lng: jumpToObs.lng, altitude: 1.6 }, 600); } catch { /* */ }
  }, [jumpToObs, ready]);

  // ---- Observation history paths ----
  const historyPath = useMemo(() => {
    if (!selectedEventId) return [];
    const event = events.find((e) => e.id === selectedEventId);
    if (!event || !event.observations || event.observations.length < 2) return [];
    const color = CATEGORY_COLORS_HEX[event.category] ?? FALLBACK_COLOR;
    const pts = event.observations
      .filter((o) => o.latitude != null && o.longitude != null && !Number.isNaN(o.latitude) && !Number.isNaN(o.longitude))
      .slice(-30);
    if (pts.length < 2) return [];
    const coords = pts.map((o) => [o.latitude, o.longitude] as [number, number]);
    return [{ coords, color }];
  }, [events, selectedEventId]);

  // ---- Build markers (events + user location) ----
  const allMarkers: MarkerData[] = useMemo(() => {
    const markers: MarkerData[] = [];

    // User location
    if (userLat != null && userLng != null) {
      markers.push({ id: "user-loc", lat: userLat, lng: userLng, color: USER_COLOR, size: 12, title: "Your location", isUser: true });
    }

    // Events
    if (events.length) {
      const evts = [...events].sort((a, b) => b.hotspotScore - a.hotspotScore).slice(0, MAX_MARKERS);
      for (const e of evts) {
        markers.push({
          id: e.id, lat: e.latitude, lng: e.longitude,
          color: CATEGORY_COLORS_HEX[e.category] ?? FALLBACK_COLOR,
          size: Math.round(6 + (e.hotspotScore / 100) * 8),
          title: e.title, isUser: false,
        });
      }
    }
    return markers;
  }, [events, userLat, userLng]);

  // ---- Create marker DOM element ----
  const createMarkerElement = useCallback((d: object): HTMLElement => {
    const m = d as MarkerData;
    const el = document.createElement("div");
    const isSelected = m.id === selectedEventId;

    el.style.width = `${m.size}px`;
    el.style.height = `${m.size}px`;
    el.style.borderRadius = m.isUser ? "2px" : "50%";
    el.style.background = m.color;
    el.style.boxShadow = `0 0 ${m.size * 2}px ${m.color}${m.isUser ? "AA" : "88"}`;
    el.style.cursor = m.isUser ? "default" : "pointer";
    el.style.transition = "transform 0.2s ease, border 0.2s ease";
    el.style.pointerEvents = "auto";
    if (m.isUser) el.style.transform = "rotate(45deg)";
    el.title = m.title;

    if (isSelected && !m.isUser) {
      el.style.border = "2px solid #F4F7FB";
      el.style.transform = "scale(1.5)";
      el.style.zIndex = "2";
    }

    el.addEventListener("click", (e: MouseEvent) => {
      e.stopPropagation();
      if (m.isUser) {
        focusUser();
        return;
      }
      const evt = eventsRef.current.find((ev) => ev.id === m.id);
      if (evt) onSelectRef.current(evt);
    });

    return el;
  }, [selectedEventId, focusUser]);

  const handleGlobeClick = useCallback(() => onSelectRef.current(null), []);

  return (
    <>
      {/* Globe */}
      <div suppressHydrationWarning style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", zIndex: 1, background: "#0a1226" }}>
        <GlobeGL
          ref={globeEl}
          globeImageUrl="/textures/earth-light.jpg"
          backgroundColor="#0a1226"
          atmosphereColor="#5599DD"
          atmosphereAltitude={0.3}
          htmlElementsData={allMarkers}
          htmlElement={createMarkerElement}
          onGlobeClick={handleGlobeClick}
          onGlobeReady={handleReady}
          enablePointerInteraction
          // Observation history path
          pathsData={historyPath.length > 0 ? (() => { const [p] = historyPath; return [{ coords: p.coords, color: p.color }]; })() : []}
          pathPoints="coords"
          pathPointLat={(p: unknown) => (p as [number, number])[0]}
          pathPointLng={(p: unknown) => (p as [number, number])[1]}
          pathPointAlt={0.02}
          pathColor={(d: object) => (d as { color: string }).color}
          pathStroke={1.5}
          pathDashLength={0.04}
          pathDashGap={0.03}
          pathDashAnimateTime={8000}
          pathTransitionDuration={500}
        />
      </div>

      {/* Controls */}
      <div style={{ position: "fixed", bottom: 16, right: 16, zIndex: 50, display: "flex", flexDirection: "column", gap: 4 }}>
        <button style={btn} onClick={zoomIn} title="Zoom in" aria-label="Zoom in"><Plus size={15} strokeWidth={1.5} /></button>
        <button style={btn} onClick={zoomOut} title="Zoom out" aria-label="Zoom out"><Minus size={15} strokeWidth={1.5} /></button>
        <div style={{ height: 1, margin: "1px 4px", background: "var(--color-border)" }} />
        <button style={btn} onClick={resetView} title="Reset view" aria-label="Reset view"><RotateCcw size={14} strokeWidth={1.5} /></button>
        <button style={btn} onClick={focusUser} title="Nearest event" aria-label="Nearest event"><MapPin size={14} strokeWidth={1.5} /></button>
        <div style={{ height: 1, margin: "1px 4px", background: "var(--color-border)" }} />
        <button style={btn} onClick={toggleAutoRotate} title={autoRotate ? "Pause rotation" : "Auto rotate"} aria-label={autoRotate ? "Pause" : "Play"}>
          {autoRotate ? <Pause size={14} strokeWidth={1.5} /> : <Play size={14} strokeWidth={1.5} />}
        </button>
      </div>
    </>
  );
}
