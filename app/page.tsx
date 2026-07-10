"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import type { EnvironmentalEvent, EventCategory, UserLocation } from "@/types/environment";
import { computePersonalRelevance } from "@/lib/scoring/personal-relevance";
import { haversineDistance } from "@/lib/geo/distance";
import { formatLocalTime, getHoursSince } from "@/lib/formatting/date";
import TopStatusBar from "@/components/layout/TopStatusBar";
import LayerPanel from "@/components/layout/LayerPanel";
import HotspotPanel from "@/components/layout/HotspotPanel";
import LocalSignalBar from "@/components/layout/LocalSignalBar";
import MobileEventSheet from "@/components/layout/MobileEventSheet";
import GlobeControls from "@/components/globe/GlobeControls";
import GlobeLegend from "@/components/globe/GlobeLegend";
import GlobeHoverTooltip from "@/components/globe/GlobeHoverTooltip";
import type { EnvironmentalGlobeRef } from "@/components/globe/GlobeImpl";

// Dynamic import for the globe — no SSR, empty loading fallback avoids hydration mismatch
const EnvironmentalGlobe = dynamic(
  () => import("@/components/globe/EnvironmentalGlobe"),
  {
    ssr: false,
    loading: () => <div style={{ position: "fixed", inset: 0, zIndex: 1 }} />,
  }
);

type EventsResponse = {
  events: EnvironmentalEvent[];
  metadata?: {
    source: string;
    eventCount: number;
  };
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
    city: null,
    country: null,
    region: null,
    latitude: null,
    longitude: null,
    timezone: null,
    source: "unavailable",
  });
  const [preciseLocation, setPreciseLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);

  // --- UI state ---
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<EnvironmentalEvent | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | "all">("all");
  const [hasFirmsKey, setHasFirmsKey] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  // --- Globe ref ---
  const globeRef = useRef<EnvironmentalGlobeRef>(null);

  // --- Fetch events ---
  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setEventsLoading(true);
      setEventsError(null);
      try {
        const res = await fetch("/api/events");
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to load events");
        }
        const data: EventsResponse = await res.json();
        if (!cancelled) {
          setEvents(data.events);
          // Support both metadata.source (new) and source (legacy)
          const src = data.metadata?.source ?? data.source ?? "offline";
          setDataSource(src === "live" ? "live" : src === "stale-cache" ? "live" : "fallback");
          setLastUpdated(new Date().toISOString());
        }
      } catch (err) {
        if (!cancelled) {
          setEventsError((err as Error).message);
          setDataSource("offline");
        }
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Fetch location ---
  useEffect(() => {
    let cancelled = false;

    async function loadLocation() {
      try {
        const res = await fetch("/api/location");
        if (!res.ok) return;
        const data: LocationResponse = await res.json();
        if (!cancelled && data.source === "vercel") {
          setUserLocation({
            city: data.city ?? null,
            country: data.country ?? null,
            region: data.region ?? null,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            timezone: data.timezone ?? null,
            source: "vercel",
          });
        } else if (!cancelled) {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setUserLocation((prev) => ({
            ...prev,
            timezone: tz || null,
            source: prev.source === "unavailable" ? "browser-tz" : prev.source,
          }));
        }
      } catch {
        // Location unavailable — app still works
      }
    }

    loadLocation();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Check FIRMS key availability ---
  useEffect(() => {
    async function checkFirms() {
      try {
        const res = await fetch("/api/fires?bbox=-0.1,-0.1,0.1,0.1&days=1");
        const data = await res.json();
        setHasFirmsKey(!("source" in data && data.source === "unavailable"));
      } catch {
        setHasFirmsKey(false);
      }
    }
    checkFirms();
  }, []);

  // --- Filtered events ---
  const filteredEvents = useMemo(() => {
    if (selectedCategory === "all") return events;
    return events.filter((e) => e.category === selectedCategory);
  }, [events, selectedCategory]);

  // Effective user coordinates
  const effectiveLat = preciseLocation?.latitude ?? userLocation.latitude;
  const effectiveLng = preciseLocation?.longitude ?? userLocation.longitude;

  // User location label
  const userLocationLabel = useMemo(() => {
    if (preciseLocation) return "Precise location for this session";
    if (userLocation.source === "vercel") return "Approximate location";
    return "Your location";
  }, [preciseLocation, userLocation.source]);

  // --- Nearest event ---
  const nearestEvent = useMemo(() => {
    if (effectiveLat == null || effectiveLng == null || events.length === 0) return null;
    let nearest: EnvironmentalEvent | null = null;
    let minDist = Infinity;
    for (const event of events) {
      const d = haversineDistance(effectiveLat, effectiveLng, event.latitude, event.longitude);
      if (d < minDist) {
        minDist = d;
        nearest = event;
      }
    }
    return nearest;
  }, [events, effectiveLat, effectiveLng]);

  const nearestDistance = useMemo(() => {
    if (!nearestEvent || effectiveLat == null || effectiveLng == null) return null;
    return haversineDistance(effectiveLat, effectiveLng, nearestEvent.latitude, nearestEvent.longitude);
  }, [nearestEvent, effectiveLat, effectiveLng]);

  const personalRelevance = useMemo(() => {
    if (!nearestEvent) return null;
    const now = new Date();
    return computePersonalRelevance({
      distanceKm: nearestDistance,
      hotspotScore: nearestEvent.hotspotScore,
      recencyHours: nearestEvent.updatedAt
        ? getHoursSince(nearestEvent.updatedAt, now)
        : null,
      isDaytimeLocal: userLocation.timezone
        ? (() => {
            const hour = parseInt(
              new Date().toLocaleString("en-US", {
                timeZone: userLocation.timezone,
                hour: "2-digit",
                hourCycle: "h23",
              }),
              10,
            );
            return hour >= 6 && hour < 20;
          })()
        : null,
    });
  }, [nearestEvent, nearestDistance, userLocation.timezone]);

  const localTime = useMemo(() => {
    if (userLocation.timezone) {
      return formatLocalTime(userLocation.timezone);
    }
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [userLocation.timezone]);

  // --- Handlers ---
  const handleSelectEvent = useCallback((event: EnvironmentalEvent | null) => {
    setSelectedEventId(event?.id ?? null);
  }, []);

  const handleHoverEvent = useCallback((event: EnvironmentalEvent | null) => {
    setHoveredEvent(event);
  }, []);

  const handleSelectCategory = useCallback((category: EventCategory | "all") => {
    setSelectedCategory(category);
  }, []);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const handleRequestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoDenied(true);
      return;
    }
    setGeoLoading(true);
    setGeoDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPreciseLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setGeoLoading(false);
      },
      () => {
        setGeoDenied(true);
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, []);

  // --- Globe control handlers ---
  const handleZoomIn = useCallback(() => globeRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => globeRef.current?.zoomOut(), []);
  const handleResetView = useCallback(() => globeRef.current?.resetView(), []);
  const handleFocusUser = useCallback(() => {
    if (effectiveLat != null && effectiveLng != null) {
      globeRef.current?.focusOnLocation(effectiveLat, effectiveLng);
    }
  }, [effectiveLat, effectiveLng]);
  const handleToggleAutoRotate = useCallback(() => {
    globeRef.current?.toggleAutoRotate();
    setIsAutoRotating((prev) => !prev);
  }, []);

  const hasUserLocation = effectiveLat != null && effectiveLng != null;

  return (
    <div style={{ height: "100dvh", width: "100vw", position: "relative", overflow: "hidden" }}>
      {/* --- Globe --- */}
      <EnvironmentalGlobe
        ref={globeRef}
        events={filteredEvents}
        selectedEventId={selectedEventId}
        onSelectEvent={handleSelectEvent}
        onHoverEvent={handleHoverEvent}
        userLatitude={effectiveLat}
        userLongitude={effectiveLng}
        userLocationLabel={userLocationLabel}
        hoveredEventId={hoveredEvent?.id ?? null}
      />

      {/* --- Hover tooltip --- */}
      <GlobeHoverTooltip event={hoveredEvent} userLocationLabel={userLocationLabel} />

      {/* --- Globe controls --- */}
      <GlobeControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetView}
        onFocusUser={handleFocusUser}
        onToggleAutoRotate={handleToggleAutoRotate}
        isAutoRotating={isAutoRotating}
        hasUserLocation={hasUserLocation}
      />

      {/* --- Globe legend --- */}
      <GlobeLegend />

      {/* --- Top Status Bar --- */}
      <TopStatusBar
        localTime={localTime}
        dataStatus={dataSource === "offline" ? "offline" : dataSource === "fallback" ? "stale" : "live"}
        isFallbackData={dataSource === "fallback"}
        eventsCount={events.length}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        onOpenInfo={() => setShowInfo(!showInfo)}
      />

      {/* --- Left Panel: Signal Layers --- */}
      <div className="panel-layer">
        <LayerPanel
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
          eventsCount={events.length}
          filteredCount={filteredEvents.length}
          hasFirmsKey={hasFirmsKey}
        />
      </div>

      {/* --- Right Panel: Global Hotspots --- */}
      <div className="panel-layer">
        <HotspotPanel
          events={filteredEvents}
          selectedEventId={selectedEventId}
          onSelectEvent={handleSelectEvent}
        />
      </div>

      {/* --- Bottom Bar: Your Signal --- */}
      <div className="panel-layer">
        <LocalSignalBar
          userLocation={userLocation}
          localTime={localTime}
          nearestEvent={nearestEvent}
          distanceKm={nearestDistance}
          personalRelevanceScore={personalRelevance}
          onRequestGeolocation={handleRequestGeolocation}
          geoLoading={geoLoading}
          geoDenied={geoDenied}
        />
      </div>

      {/* --- Mobile Bottom Sheet --- */}
      <MobileEventSheet
        events={filteredEvents}
        selectedEventId={selectedEventId}
        onSelectEvent={handleSelectEvent}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      {/* --- Info / Disclaimer Modal --- */}
      {showInfo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowInfo(false)}
          role="dialog"
          aria-label="About Planet Pulse"
          aria-modal="true"
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: 480,
              width: "90%",
              padding: 32,
              color: "var(--color-text-primary)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              About Planet Pulse
            </h2>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>
              Planet Pulse transforms scattered environmental data into a clear global overview
              and a personalized local environmental signal.
            </p>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginBottom: 8 }}>
                Data Sources
              </h3>
              <ul style={{ color: "var(--color-text-secondary)", fontSize: 13, lineHeight: 2, paddingLeft: 16 }}>
                <li>Environmental events from NASA EONET v3</li>
                <li>Fire detections from NASA FIRMS (when configured)</li>
              </ul>
            </div>
            <div style={{
              background: "rgba(245, 166, 35, 0.1)",
              border: "1px solid rgba(245, 166, 35, 0.3)",
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              color: "var(--color-warning)",
              lineHeight: 1.5,
              marginBottom: 12,
            }}>
              <strong>Disclaimer:</strong> Planet Pulse uses satellite and public environmental data
              for awareness and exploration. It is not an official emergency alert service.
            </div>
            <div style={{
              marginBottom: 20,
              padding: "0 4px",
              fontSize: 11,
              color: "var(--color-text-muted)",
              lineHeight: 1.6,
              textAlign: "center",
            }}>
              Copyright © 2026 <strong style={{ color: "var(--color-text-secondary)" }}>John Zhou</strong>.
              Licensed under the{" "}
              <a
                href="https://www.apache.org/licenses/LICENSE-2.0"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-location)", textDecoration: "underline" }}
              >
                Apache License 2.0
              </a>.
            </div>
            <button
              onClick={() => setShowInfo(false)}
              style={{
                width: "100%",
                padding: "10px 0",
                background: "var(--color-location)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* --- Events Loading State --- */}
      {eventsLoading && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            background: "var(--color-bg-panel)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            padding: "8px 20px",
            color: "var(--color-text-secondary)",
            fontSize: 13,
          }}
        >
          Loading environmental data…
        </div>
      )}

      {/* --- Events Error State --- */}
      {eventsError && !eventsLoading && events.length === 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            background: "var(--color-bg-panel)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 67, 93, 0.3)",
            borderRadius: 8,
            padding: "12px 20px",
            color: "var(--color-volcano)",
            fontSize: 13,
            maxWidth: 360,
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0 }}>Unable to load environmental data.</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.7 }}>{eventsError}</p>
          <button
            onClick={handleRefresh}
            style={{
              marginTop: 8,
              background: "var(--color-location)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
