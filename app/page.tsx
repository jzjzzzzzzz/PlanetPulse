"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { EnvironmentalEvent, EventCategory, UserLocation } from "@/types/environment";
import { computePersonalRelevance } from "@/lib/scoring/personal-relevance";
import { haversineDistance } from "@/lib/geo/distance";
import { formatLocalTime, getHoursSince } from "@/lib/formatting/date";
import TopStatusBar from "@/components/layout/TopStatusBar";
import LayerPanel from "@/components/layout/LayerPanel";
import HotspotPanel from "@/components/layout/HotspotPanel";
import LocalSignalBar from "@/components/layout/LocalSignalBar";
import MobileEventSheet from "@/components/layout/MobileEventSheet";
import GlobeLegend from "@/components/globe/GlobeLegend";
import EventDetails from "@/components/events/EventDetails";
import ObservationTimeline from "@/components/events/ObservationTimeline";
import EpicSatellite from "@/components/events/EpicSatellite";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { Share2 } from "lucide-react";

// Dynamic import for the globe — no SSR
const EnvironmentalGlobe = dynamic(
  () => import("@/components/globe/DebugGlobe"),
  { ssr: false }
);

type EventsResponse = {
  events: EnvironmentalEvent[];
  metadata?: { source: string; eventCount: number };
  source?: string;
  count?: number;
};

type LocationResponse = UserLocation & { source: string };

export default function Home() {
  // --- Data state ---
  const [events, setEvents] = useState<EnvironmentalEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"live" | "fallback" | "offline">("offline");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // --- Location state ---
  const [userLocation, setUserLocation] = useState<UserLocation>({
    city: null, country: null, region: null, latitude: null, longitude: null, timezone: null, source: "unavailable",
  });
  const [hasFirmsKey, setHasFirmsKey] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // --- UI state ---
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | "all">("all");
  const [refreshIn, setRefreshIn] = useState(60);
  const [jumpToObs, setJumpToObs] = useState<{ lat: number; lng: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // --- Fetch events (extracted for reuse) ---
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Failed to load");
      const data: EventsResponse = await res.json();
      setEvents(data.events ?? []);
      setDataSource(data.metadata?.source === "live" ? "live" : data.metadata?.source === "stale-cache" ? "live" : "fallback");
      setLastUpdated(new Date().toISOString());
      setEventsError(null);
    } catch (err) {
      setEventsError((err as Error).message);
      setDataSource("offline");
    }
  }, []);

  // --- Initial load ---
  useEffect(() => {
    setEventsLoading(true);
    fetchEvents().finally(() => setEventsLoading(false));
  }, [fetchEvents]);

  // --- Auto-refresh every 60s ---
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents();
      setRefreshIn(60);
    }, 60_000);

    const countdown = setInterval(() => {
      setRefreshIn((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);

    return () => { clearInterval(interval); clearInterval(countdown); };
  }, [fetchEvents]);

  // --- Fetch location ---
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/location");
        if (!res.ok) return;
        const data: LocationResponse = await res.json();
        if (!cancelled && data.source === "vercel") {
          setUserLocation({
            city: data.city ?? null, country: data.country ?? null, region: data.region ?? null,
            latitude: data.latitude ?? null, longitude: data.longitude ?? null,
            timezone: data.timezone ?? null, source: "vercel",
          });
        } else if (!cancelled) {
          setUserLocation((prev) => ({ ...prev, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null, source: prev.source === "unavailable" ? "browser-tz" : prev.source }));
        }
      } catch { /* */ }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { fetch("/api/fires?bbox=-0.1,-0.1,0.1,0.1&days=1").then(r => r.json()).then(d => setHasFirmsKey(!(d.source === "unavailable"))).catch(() => {}); }, []);

  // --- Computed ---
  const filteredEvents = useMemo(() => selectedCategory === "all" ? events : events.filter(e => e.category === selectedCategory), [events, selectedCategory]);
  const effectiveLat = userLocation.latitude;
  const effectiveLng = userLocation.longitude;

  const nearestEvent = useMemo(() => {
    if (effectiveLat == null || effectiveLng == null || !events.length) return null;
    let best: EnvironmentalEvent | null = null; let min = Infinity;
    for (const e of events) { const d = haversineDistance(effectiveLat, effectiveLng, e.latitude, e.longitude); if (d < min) { min = d; best = e; } }
    return best;
  }, [events, effectiveLat, effectiveLng]);

  const nearestDistance = useMemo(() => nearestEvent && effectiveLat ? haversineDistance(effectiveLat, effectiveLng!, nearestEvent.latitude, nearestEvent.longitude) : null, [nearestEvent, effectiveLat, effectiveLng]);

  const personalRelevance = useMemo(() => {
    if (!nearestEvent) return null;
    return computePersonalRelevance({ distanceKm: nearestDistance, hotspotScore: nearestEvent.hotspotScore, recencyHours: nearestEvent.updatedAt ? getHoursSince(nearestEvent.updatedAt, new Date()) : null, isDaytimeLocal: null });
  }, [nearestEvent, nearestDistance]);

  const localTime = useMemo(() => userLocation.timezone ? formatLocalTime(userLocation.timezone) : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), [userLocation.timezone]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {} as Record<string, number>;
    for (const e of events) { counts[e.category] = (counts[e.category] ?? 0) + 1; }
    return counts;
  }, [events]);

  // --- Handlers ---
  const searchParams = useSearchParams();
  
  const handleSelectEvent = useCallback((e: EnvironmentalEvent | null) => {
    setSelectedEventId(e?.id ?? null);
    // Update URL for sharing
    if (e?.id) {
      window.history.replaceState(null, "", `?event=${e.id}`);
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const handleShareEvent = useCallback(() => {
    if (selectedEventId) {
      const url = `${window.location.origin}?event=${selectedEventId}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }, [selectedEventId]);

  // Load event from URL on mount
  useEffect(() => {
    const eventId = searchParams.get("event");
    if (eventId && events.length > 0) {
      const evt = events.find((e) => e.id === eventId);
      if (evt) setSelectedEventId(evt.id);
    }
  }, [searchParams, events]);
  const handleCloseEvent = useCallback(() => setSelectedEventId(null), []);
  const selectedEvent = useMemo(() => selectedEventId ? events.find(e => e.id === selectedEventId) ?? null : null, [events, selectedEventId]);

  const handleSelectCategory = useCallback((cat: EventCategory | "all") => setSelectedCategory(cat), []);
  const handleRefresh = useCallback(() => window.location.reload(), []);

  return (
    <div style={{ height: "100dvh", width: "100vw", position: "relative", overflow: "hidden" }}>
      <EnvironmentalGlobe
        events={filteredEvents}
        selectedEventId={selectedEventId}
        onSelectEvent={handleSelectEvent}
        userLat={effectiveLat}
        userLng={effectiveLng}
        nearestEvent={nearestEvent}
        jumpToObs={jumpToObs}
      />

      <EventDetails
        event={selectedEvent}
        distanceKm={selectedEvent && effectiveLat ? haversineDistance(effectiveLat, effectiveLng!, selectedEvent.latitude, selectedEvent.longitude) : null}
        onFocusGlobe={() => selectedEvent && handleSelectEvent(selectedEvent)}
        onClose={handleCloseEvent}
      />

      <ObservationTimeline event={selectedEvent} onJumpTo={(obs) => setJumpToObs({ lat: obs.latitude, lng: obs.longitude })} />

      <EpicSatellite lat={selectedEvent?.latitude ?? null} lng={selectedEvent?.longitude ?? null} />

      <ThemeToggle />

      {/* Share button — only when event selected */}
      {selectedEventId && (
        <button
          onClick={handleShareEvent}
          style={{
            position: "fixed", top: 44, left: 56, zIndex: 100,
            width: 34, height: 34, borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-glass)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            color: "var(--color-text-secondary)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          title="Copy share link"
          aria-label="Copy share link"
        >
          <Share2 size={14} strokeWidth={1.5} />
        </button>
      )}

      {copied && (
        <div style={{ position: "fixed", top: 44, left: 96, zIndex: 100, background: "var(--color-bg-panel)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "var(--color-success)" }}>
          Link copied!
        </div>
      )}

      <TopStatusBar localTime={localTime} dataStatus={dataSource === "offline" ? "offline" : dataSource === "fallback" ? "stale" : "live"} isFallbackData={dataSource === "fallback"} eventsCount={events.length} lastUpdated={lastUpdated} refreshIn={refreshIn} onRefresh={handleRefresh} onOpenInfo={() => setShowInfo(!showInfo)} />

      <div className="panel-layer">
        <LayerPanel selectedCategory={selectedCategory} onSelectCategory={handleSelectCategory} eventsCount={events.length} filteredCount={filteredEvents.length} categoryCounts={categoryCounts} hasFirmsKey={hasFirmsKey} />
      </div>

      <div className="panel-layer">
        <HotspotPanel events={filteredEvents} selectedEventId={selectedEventId} onSelectEvent={handleSelectEvent} />
      </div>

      <div className="panel-layer">
        <LocalSignalBar userLocation={userLocation} localTime={localTime} nearestEvent={nearestEvent} distanceKm={nearestDistance} personalRelevanceScore={personalRelevance} onRequestGeolocation={() => {}} geoLoading={false} geoDenied={false} />
      </div>

      <MobileEventSheet events={filteredEvents} selectedEventId={selectedEventId} onSelectEvent={handleSelectEvent} selectedCategory={selectedCategory} onSelectCategory={handleSelectCategory} />

      <GlobeLegend />

      {showInfo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setShowInfo(false)} role="dialog" aria-modal="true">
          <div className="glass-panel" style={{ maxWidth: 480, width: "90%", padding: 32, color: "var(--color-text-primary)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>About Planet Pulse</h2>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>Planet Pulse transforms scattered environmental data into a clear global overview and a personalized local environmental signal.</p>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginBottom: 8 }}>Data Sources</h3>
              <ul style={{ color: "var(--color-text-secondary)", fontSize: 13, lineHeight: 2, paddingLeft: 16 }}>
                <li>Environmental events from NASA EONET v3</li>
                <li>Fire detections from NASA FIRMS (when configured)</li>
              </ul>
            </div>
            <div style={{ background: "rgba(245, 166, 35, 0.1)", border: "1px solid rgba(245, 166, 35, 0.3)", borderRadius: 8, padding: 12, fontSize: 12, color: "var(--color-warning)", lineHeight: 1.5, marginBottom: 12 }}>
              <strong>Disclaimer:</strong> Planet Pulse uses satellite and public environmental data for awareness and exploration. It is not an official emergency alert service.
            </div>
            <div style={{ marginBottom: 20, padding: "0 4px", fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.6, textAlign: "center" }}>
              Copyright © 2026 <strong style={{ color: "var(--color-text-secondary)" }}>John Zhou</strong>. Licensed under the <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-location)", textDecoration: "underline" }}>Apache License 2.0</a>.
            </div>
            <button onClick={() => setShowInfo(false)} style={{ width: "100%", padding: "10px 0", background: "var(--color-location)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Close</button>
          </div>
        </div>
      )}

      {eventsLoading && (
        <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", zIndex: 30, background: "var(--color-bg-panel)", backdropFilter: "blur(12px)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 20px", color: "var(--color-text-secondary)", fontSize: 13 }}>Loading environmental data…</div>
      )}

      {eventsError && !eventsLoading && events.length === 0 && (
        <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", zIndex: 30, background: "var(--color-bg-panel)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 67, 93, 0.3)", borderRadius: 8, padding: "12px 20px", color: "var(--color-volcano)", fontSize: 13, maxWidth: 360, textAlign: "center" }}>
          <p style={{ margin: 0 }}>Unable to load environmental data.</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.7 }}>{eventsError}</p>
          <button onClick={handleRefresh} style={{ marginTop: 8, background: "var(--color-location)", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Retry</button>
        </div>
      )}
    </div>
  );
}
