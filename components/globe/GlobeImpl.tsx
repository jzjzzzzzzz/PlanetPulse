"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import GlobeGL from "react-globe.gl";
import type { EnvironmentalEvent } from "@/types/environment";
import { CATEGORY_COLORS_HEX } from "@/types/environment";
import { getSeverityTier } from "@/lib/globe/event-visuals";
import {
  USER_MARKER_COLOR,
  DEFAULT_ALTITUDE,
  MIN_ALTITUDE,
  MAX_ALTITUDE,
  AUTO_ROTATE_SPEED,
  FOCUS_DURATION_MS,
  FOCUS_DURATION_REDUCED_MS,
} from "@/lib/globe/event-visuals";

// ============================================================
// Types
// ============================================================

type MarkerData = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  size: number;
  isSelected: boolean;
  isHighScore: boolean;
  isUser: boolean;
  title: string;
};

export type EnvironmentalGlobeRef = {
  focusOnLocation: (lat: number, lng: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  toggleAutoRotate: () => void;
  isAutoRotating: () => boolean;
};

type GlobeImplProps = {
  events: EnvironmentalEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: EnvironmentalEvent | null) => void;
  onHoverEvent?: (event: EnvironmentalEvent | null) => void;
  userLatitude: number | null;
  userLongitude: number | null;
  userLocationLabel?: string;
  hoveredEventId?: string | null;
};

// ============================================================
// Constants
// ============================================================

const MAX_MARKERS = 200;
const USER_MARKER_SIZE = 12;
const FALLBACK_COLOR = "#8D9AAF";
const SELECTED_BORDER_COLOR = "#F4F7FB";

const INJECTED_STYLES = `
  @keyframes marker-pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.15); }
  }
  .globe-marker--pulse {
    animation: marker-pulse 2.2s ease-in-out infinite;
  }
  .globe-marker--selected {
    border: 2px solid ${SELECTED_BORDER_COLOR} !important;
    transform: scale(1.35) !important;
    z-index: 2;
    position: relative;
  }
  .globe-marker--user {
    border-radius: 2px !important;
    transform: rotate(45deg);
  }
  .globe-marker--user.globe-marker--selected {
    transform: rotate(45deg) scale(1.35) !important;
  }
`;

// ============================================================
// Component
// ============================================================

const GlobeImpl = forwardRef<EnvironmentalGlobeRef, GlobeImplProps>(
  function GlobeImpl(
    {
      events,
      selectedEventId,
      onSelectEvent,
      onHoverEvent,
      userLatitude,
      userLongitude,
      userLocationLabel,
      hoveredEventId,
    },
    ref,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globeEl = useRef<any>(null);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [globeReady, setGlobeReady] = useState(false);
    const autoRotateRef = useRef(true);
    const prefersReducedMotion = useRef(false);

    // Mutable refs
    const eventsRef = useRef(events);
    eventsRef.current = events;
    const onSelectRef = useRef(onSelectEvent);
    onSelectRef.current = onSelectEvent;
    const onHoverRef = useRef(onHoverEvent);
    onHoverRef.current = onHoverEvent;

    // ---- Reduced motion ----
    useEffect(() => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      prefersReducedMotion.current = mq.matches;
      const handler = (e: MediaQueryListEvent) => { prefersReducedMotion.current = e.matches; };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }, []);

    // ---- Build event markers ----
    const eventMarkers: MarkerData[] = useMemo(() => {
      if (!events.length) return [];
      return [...events]
        .sort((a, b) => b.hotspotScore - a.hotspotScore)
        .slice(0, MAX_MARKERS)
        .map((e) => {
          const tier = getSeverityTier(e.hotspotScore);
          return {
            id: e.id,
            lat: e.latitude,
            lng: e.longitude,
            color: CATEGORY_COLORS_HEX[e.category] ?? FALLBACK_COLOR,
            size: Math.round(Math.min(6 + (e.hotspotScore / 100) * 10, 16)),
            isSelected: e.id === selectedEventId,
            isHighScore: tier !== "low",
            isUser: false,
            title: e.title,
          };
        });
    }, [events, selectedEventId]);

    // ---- User marker ----
    const userMarker: MarkerData[] = useMemo(() => {
      if (userLatitude == null || userLongitude == null) return [];
      return [{
        id: "user-location",
        lat: userLatitude,
        lng: userLongitude,
        color: USER_MARKER_COLOR,
        size: USER_MARKER_SIZE,
        isSelected: false,
        isHighScore: false,
        isUser: true,
        title: userLocationLabel ?? "Your location",
      }];
    }, [userLatitude, userLongitude, userLocationLabel]);

    const allMarkers: MarkerData[] = useMemo(
      () => [...userMarker, ...eventMarkers],
      [userMarker, eventMarkers],
    );

    // ---- Fly to selected event ----
    useEffect(() => {
      if (!globeEl.current || !selectedEventId || !globeReady) return;
      const event = events.find((e) => e.id === selectedEventId);
      if (!event) return;
      const duration = prefersReducedMotion.current ? FOCUS_DURATION_REDUCED_MS : FOCUS_DURATION_MS;
      const timer = setTimeout(() => {
        try {
          globeEl.current?.pointOfView?.({ lat: event.latitude, lng: event.longitude, altitude: 1.5 }, duration);
        } catch { /* ignore */ }
      }, 150);
      return () => clearTimeout(timer);
    }, [selectedEventId, events, globeReady]);

    // ---- Imperative handle ----
    useImperativeHandle(ref, () => ({
      focusOnLocation(lat: number, lng: number) {
        try {
          const d = prefersReducedMotion.current ? 0 : FOCUS_DURATION_MS;
          globeEl.current?.pointOfView?.({ lat, lng, altitude: 1.5 }, d);
        } catch { /* ignore */ }
      },
      zoomIn() {
        try {
          const c = globeEl.current?.controls();
          if (c) c.target.setLength(Math.max(MIN_ALTITUDE, c.target.length() * 0.7), true);
        } catch { /* ignore */ }
      },
      zoomOut() {
        try {
          const c = globeEl.current?.controls();
          if (c) c.target.setLength(Math.min(MAX_ALTITUDE, c.target.length() * 1.4), true);
        } catch { /* ignore */ }
      },
      resetView() {
        try {
          globeEl.current?.pointOfView?.({ lat: 20, lng: 0, altitude: DEFAULT_ALTITUDE }, prefersReducedMotion.current ? 0 : 800);
        } catch { /* ignore */ }
      },
      toggleAutoRotate() {
        try {
          const c = globeEl.current?.controls();
          if (c) { autoRotateRef.current = !autoRotateRef.current; c.autoRotate = autoRotateRef.current; }
        } catch { /* ignore */ }
      },
      isAutoRotating() { return autoRotateRef.current; },
    }), []);

    // ---- Setup OrbitControls ----
    useEffect(() => {
      if (!globeReady) return;
      const id = setTimeout(() => {
        try {
          const c = globeEl.current?.controls();
          if (c) {
            c.autoRotate = !prefersReducedMotion.current;
            c.autoRotateSpeed = AUTO_ROTATE_SPEED;
            c.enableDamping = true;
            c.dampingFactor = 0.08;
            c.minDistance = MIN_ALTITUDE;
            c.maxDistance = MAX_ALTITUDE;
            c.rotateSpeed = 0.4;
            c.zoomSpeed = 0.8;
            c.enablePan = false;
            autoRotateRef.current = !prefersReducedMotion.current;
          }
        } catch { /* ignore */ }
      }, 300);
      return () => clearTimeout(id);
    }, [globeReady]);

    // ---- Stop auto-rotation after interaction ----
    useEffect(() => {
      if (!hasInteracted || !globeReady) return;
      try {
        const c = globeEl.current?.controls();
        if (c) { c.autoRotate = false; autoRotateRef.current = false; }
      } catch { /* ignore */ }
    }, [hasInteracted, globeReady]);

    // ---- Handle ready ----
    const handleGlobeReady = useCallback(() => {
      setGlobeReady(true);
    }, []);

    // ---- Handle globe click ----
    const handleGlobeClick = useCallback(() => {
      setHasInteracted(true);
      onSelectRef.current(null);
    }, []);

    // ---- Create marker DOM element ----
    const createMarkerElement = useCallback((d: object): HTMLElement => {
      const m = d as MarkerData;
      const el = document.createElement("div");

      el.style.width = `${m.size}px`;
      el.style.height = `${m.size}px`;
      el.style.borderRadius = m.isUser ? "2px" : "50%";
      el.style.background = m.color;
      el.style.boxShadow = `0 0 ${m.size * 1.5}px ${m.color}55`;
      el.style.cursor = m.isUser ? "default" : "pointer";
      el.style.transition = "transform 0.2s ease, border 0.2s ease";
      el.style.pointerEvents = "auto";
      if (m.isUser) el.style.transform = "rotate(45deg)";

      if (m.isHighScore) {
        el.classList.add("globe-marker--pulse");
      }

      if (m.isSelected) {
        el.classList.add("globe-marker--selected");
        if (m.isUser) el.style.transform = "rotate(45deg) scale(1.35)";
      }

      el.title = m.title;

      // Hover
      el.addEventListener("mouseenter", () => {
        if (m.id === "user-location") {
          onHoverRef.current?.({ id: "user-location" } as unknown as EnvironmentalEvent);
        } else {
          const evt = eventsRef.current.find((e) => e.id === m.id);
          if (evt) onHoverRef.current?.(evt);
        }
      });
      el.addEventListener("mouseleave", () => {
        onHoverRef.current?.(null);
      });

      // Click
      el.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        setHasInteracted(true);
        if (m.id === "user-location") return;
        const evt = eventsRef.current.find((ev) => ev.id === m.id);
        if (evt) onSelectRef.current(evt);
      });

      return el;
    }, []);

    // ============================================================
    // Render
    // ============================================================

    return (
      <div
        id="globe-container"
        suppressHydrationWarning
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100dvh",
          zIndex: 1,
          background: "transparent",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <style>{INJECTED_STYLES}</style>

        <GlobeGL
          ref={globeEl}
          globeImageUrl="/textures/earth-blue-marble.jpg"
          backgroundColor="#0a1628"
          atmosphereColor="#4FA4FF"
          atmosphereAltitude={0.25}
          htmlElementsData={allMarkers}
          htmlElement={createMarkerElement}
          onGlobeClick={handleGlobeClick}
          onGlobeReady={handleGlobeReady}
          enablePointerInteraction
        />
      </div>
    );
  },
);

export default React.memo(GlobeImpl);
