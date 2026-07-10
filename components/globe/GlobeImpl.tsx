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
};

type GlobeImplProps = {
  events: EnvironmentalEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: EnvironmentalEvent | null) => void;
  userLatitude: number | null;
  userLongitude: number | null;
};

// ============================================================
// Constants
// ============================================================

const MAX_MARKERS = 200;
const USER_MARKER_COLOR = "#45A3FF";
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
`;

// ============================================================
// Component
// ============================================================

const GlobeImpl = forwardRef<EnvironmentalGlobeRef, GlobeImplProps>(
  function GlobeImpl(
    { events, selectedEventId, onSelectEvent, userLatitude, userLongitude },
    ref
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- GlobeMethods from react-globe.gl is complex
    const globeEl = useRef<any>(null!);
    const [hasInteracted, setHasInteracted] = useState(false);

    // Mutable ref so DOM event handlers always read the latest events/state
    const eventsRef = useRef(events);
    eventsRef.current = events;
    const onSelectRef = useRef(onSelectEvent);
    onSelectRef.current = onSelectEvent;
    const selectedIdRef = useRef(selectedEventId);
    selectedIdRef.current = selectedEventId;

    // ----- Build event markers (top 200 by hotspotScore) -----

    const eventMarkers: MarkerData[] = useMemo(() => {
      if (!events.length) return [];
      return [...events]
        .sort((a, b) => b.hotspotScore - a.hotspotScore)
        .slice(0, MAX_MARKERS)
        .map((e) => ({
          id: e.id,
          lat: e.latitude,
          lng: e.longitude,
          color: CATEGORY_COLORS_HEX[e.category] ?? FALLBACK_COLOR,
          size: Math.round(Math.min(6 + (e.hotspotScore / 100) * 10, 16)),
          isSelected: e.id === selectedEventId,
          isHighScore: e.hotspotScore > 60,
          isUser: false,
          title: e.title,
        }));
    }, [events, selectedEventId]);

    // ----- User-location marker -----

    const userMarker: MarkerData[] = useMemo(() => {
      if (userLatitude == null || userLongitude == null) return [];
      return [
        {
          id: "user-location",
          lat: userLatitude,
          lng: userLongitude,
          color: USER_MARKER_COLOR,
          size: 12,
          isSelected: false,
          isHighScore: false,
          isUser: true,
          title: "Your location",
        },
      ];
    }, [userLatitude, userLongitude]);

    const allMarkers: MarkerData[] = useMemo(
      () => [...userMarker, ...eventMarkers],
      [userMarker, eventMarkers]
    );

    // ----- Fly to selected event -----

    useEffect(() => {
      if (!globeEl.current || !selectedEventId) return;
      const event = events.find((e) => e.id === selectedEventId);
      if (!event) return;
      const timer = setTimeout(() => {
        try {
          globeEl.current?.pointOfView?.(
            { lat: event.latitude, lng: event.longitude, altitude: 1.5 },
            1000
          );
        } catch { /* globe may not be ready */ }
      }, 150);
      return () => clearTimeout(timer);
    }, [selectedEventId, events]);

    // ----- Imperative handle -----

    useImperativeHandle(ref, () => ({
      focusOnLocation(lat: number, lng: number) {
        try {
          globeEl.current?.pointOfView?.({ lat, lng, altitude: 1.5 }, 1000);
        } catch { /* ignore */ }
      },
    }), []);

    // ----- Globe interaction -----

    // Set up auto-rotation via Three.js OrbitControls
    useEffect(() => {
      const timer = setTimeout(() => {
        try {
          const controls = globeEl.current?.controls();
          if (controls) {
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.3;
          }
        } catch { /* globe controls not ready */ }
      }, 500);
      return () => clearTimeout(timer);
    }, []);

    // Stop auto-rotation after user interaction
    useEffect(() => {
      if (!hasInteracted) return;
      try {
        const controls = globeEl.current?.controls();
        if (controls) controls.autoRotate = false;
      } catch { /* ignore */ }
    }, [hasInteracted]);

    const handleGlobeClick = useCallback(() => {
      setHasInteracted(true);
      onSelectRef.current(null);
    }, []);

    // ----- Create marker DOM element -----

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

      // Pulsing ring for high-score events
      if (m.isHighScore) {
        el.classList.add("globe-marker--pulse");
        el.style.setProperty("--glow-color", m.color);
      }

      // Selected state
      if (m.isSelected) {
        el.classList.add("globe-marker--selected");
        if (m.isUser) {
          el.style.transform = "rotate(45deg) scale(1.35)";
        }
      }

      // Browser native tooltip
      el.title = m.title;

      // Click handler via DOM
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
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: "transparent",
        }}
      >
        <style>{INJECTED_STYLES}</style>

        <GlobeGL
          ref={globeEl}
          globeImageUrl="/textures/earth-dark.jpg"
          backgroundColor="rgba(0,0,0,0)"
          atmosphereColor="#45A3FF"
          atmosphereAltitude={0.15}
          htmlElementsData={allMarkers}
          htmlElement={createMarkerElement}
          onGlobeClick={handleGlobeClick}
          enablePointerInteraction
        />
      </div>
    );
  }
);

export default React.memo(GlobeImpl);
