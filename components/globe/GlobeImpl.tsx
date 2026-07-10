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
import {
  getEventColor,
  getPointRadius,
  getPointAltitude,
  getSeverityTier,
  getRingRadius,
  getRingSpeed,
  SELECTED_SCALE,
  SELECTED_ALTITUDE_SCALE,
  USER_MARKER_COLOR,
  USER_MARKER_RADIUS,
  USER_MARKER_RING_COLOR,
  USER_MARKER_RING_RADIUS,
  DEFAULT_ALTITUDE,
  MIN_ALTITUDE,
  MAX_ALTITUDE,
  AUTO_ROTATE_SPEED,
  FOCUS_DURATION_MS,
  FOCUS_DURATION_REDUCED_MS,
  prepareHistoryPath,
} from "@/lib/globe/event-visuals";

// ============================================================
// Types
// ============================================================

type PointData = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  radius: number;
  altitude: number;
  isUser: boolean;
  isSelected: boolean;
  severityTier: string;
  event: EnvironmentalEvent | null;
};

type RingData = {
  lat: number;
  lng: number;
  color: string;
  maxRadius: number;
  propagationSpeed: number;
  repeatPeriod: number;
};

type LabelData = {
  lat: number;
  lng: number;
  text: string;
  color: string;
  size: number;
  altitude: number;
};

type HistoryArc = {
  lat: number;
  lng: number;
  color: string;
  opacity: number;
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
const LOW_SCORE_COLOR = "rgba(141, 154, 175, 0.5)";

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
    const globeEl = useRef<any>(null!);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [globeReady, setGlobeReady] = useState(false);
    const autoRotateRef = useRef(true);
    const prefersReducedMotion = useRef(false);

    // Mutable refs for DOM/Three.js callbacks
    const eventsRef = useRef(events);
    eventsRef.current = events;
    const onSelectRef = useRef(onSelectEvent);
    onSelectRef.current = onSelectEvent;
    const onHoverRef = useRef(onHoverEvent);
    onHoverRef.current = onHoverEvent;
    const selectedIdRef = useRef(selectedEventId);
    selectedIdRef.current = selectedEventId;
    const hoveredIdRef = useRef(hoveredEventId);
    hoveredIdRef.current = hoveredEventId;

    // ---- Reduced motion detection ----
    useEffect(() => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      prefersReducedMotion.current = mq.matches;
      const handler = (e: MediaQueryListEvent) => {
        prefersReducedMotion.current = e.matches;
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }, []);

    // ---- Build event markers (top 200 by hotspotScore) ----
    const { pointData, ringData, labelData } = useMemo(() => {
      const points: PointData[] = [];
      const rings: RingData[] = [];
      const labels: LabelData[] = [];

      if (!events.length) return { pointData: points, ringData: rings, labelData: labels };

      const sorted = [...events]
        .sort((a, b) => b.hotspotScore - a.hotspotScore)
        .slice(0, MAX_MARKERS);

      for (const event of sorted) {
        const isSelected = event.id === selectedEventId;
        const isHovered = event.id === hoveredEventId;
        const color = getEventColor(event.category);
        const tier = getSeverityTier(event.hotspotScore);
        const baseRadius = getPointRadius(event.hotspotScore);
        const baseAltitude = getPointAltitude(event.hotspotScore);

        const radius = isSelected
          ? baseRadius * SELECTED_SCALE
          : isHovered
            ? baseRadius * 1.3
            : baseRadius;
        const altitude = isSelected
          ? baseAltitude * SELECTED_ALTITUDE_SCALE
          : isHovered
            ? baseAltitude * 1.4
            : baseAltitude;

        points.push({
          id: event.id,
          lat: event.latitude,
          lng: event.longitude,
          color,
          radius,
          altitude,
          isUser: false,
          isSelected,
          severityTier: tier,
          event,
        });

        // Animated ring for medium+ severity
        if (tier !== "low") {
          rings.push({
            lat: event.latitude,
            lng: event.longitude,
            color,
            maxRadius: getRingRadius(event.hotspotScore),
            propagationSpeed: getRingSpeed(event.hotspotScore),
            repeatPeriod: getRingSpeed(event.hotspotScore),
          });
        }

        // Label for selected event only
        if (isSelected) {
          labels.push({
            lat: event.latitude,
            lng: event.longitude,
            text: event.title,
            color: "#F4F7FB",
            size: 0.18,
            altitude: altitude + 0.15,
          });
        }
      }

      return { pointData: points, ringData: rings, labelData: labels };
    }, [events, selectedEventId, hoveredEventId]);

    // ---- User-location marker ----
    const userPoint: PointData[] = useMemo(() => {
      if (userLatitude == null || userLongitude == null) return [];
      return [
        {
          id: "user-location",
          lat: userLatitude,
          lng: userLongitude,
          color: USER_MARKER_COLOR,
          radius: USER_MARKER_RADIUS,
          altitude: 0.04,
          isUser: true,
          isSelected: false,
          severityTier: "low",
          event: null,
        },
      ];
    }, [userLatitude, userLongitude]);

    const userRing: RingData[] = useMemo(() => {
      if (userLatitude == null || userLongitude == null) return [];
      return [
        {
          lat: userLatitude,
          lng: userLongitude,
          color: USER_MARKER_RING_COLOR,
          maxRadius: USER_MARKER_RING_RADIUS,
          propagationSpeed: 4000,
          repeatPeriod: 4000,
        },
      ];
    }, [userLatitude, userLongitude]);

    const userLabel: LabelData[] = useMemo(() => {
      if (userLatitude == null || userLongitude == null) return [];
      return [
        {
          lat: userLatitude,
          lng: userLongitude,
          text: userLocationLabel ?? "Approximate location",
          color: USER_MARKER_COLOR,
          size: 0.14,
          altitude: 0.23,
        },
      ];
    }, [userLatitude, userLongitude, userLocationLabel]);

    // ---- Observation history arcs ----
    const historyArcs: HistoryArc[] = useMemo(() => {
      if (!selectedEventId) return [];
      const event = events.find((e) => e.id === selectedEventId);
      if (!event || event.observations.length < 2) return [];

      const path = prepareHistoryPath(event.observations, 30);
      if (path.length < 2) return [];

      const color = getEventColor(event.category);
      return path.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        color,
        opacity: 0.15 + p.progress * 0.8,
      }));
    }, [events, selectedEventId]);

    // ---- Combined data ----
    const allPoints = useMemo(
      () => [...userPoint, ...pointData],
      [userPoint, pointData],
    );
    const allRings = useMemo(
      () => [...userRing, ...ringData],
      [userRing, ringData],
    );
    const allLabels = useMemo(
      () => [...userLabel, ...labelData],
      [userLabel, labelData],
    );

    // ---- Fly to selected event ----
    useEffect(() => {
      if (!globeEl.current || !selectedEventId || !globeReady) return;
      const event = events.find((e) => e.id === selectedEventId);
      if (!event) return;

      const duration = prefersReducedMotion.current
        ? FOCUS_DURATION_REDUCED_MS
        : FOCUS_DURATION_MS;

      // Cancel any in-flight animation
      const timer = setTimeout(() => {
        try {
          globeEl.current?.pointOfView?.(
            { lat: event.latitude, lng: event.longitude, altitude: 1.6 },
            duration,
          );
        } catch { /* globe not ready */ }
      }, 50);

      return () => clearTimeout(timer);
    }, [selectedEventId, events, globeReady]);

    // ---- Imperative handle ----
    useImperativeHandle(
      ref,
      () => ({
        focusOnLocation(lat: number, lng: number) {
          try {
            const duration = prefersReducedMotion.current
              ? FOCUS_DURATION_REDUCED_MS
              : FOCUS_DURATION_MS;
            globeEl.current?.pointOfView?.(
              { lat, lng, altitude: 1.6 },
              duration,
            );
          } catch { /* ignore */ }
        },
        zoomIn() {
          try {
            const controls = globeEl.current?.controls();
            if (controls) {
              const current = controls.target.length();
              const target = Math.max(MIN_ALTITUDE, current * 0.7);
              controls.target.setLength(target, true);
            }
          } catch { /* ignore */ }
        },
        zoomOut() {
          try {
            const controls = globeEl.current?.controls();
            if (controls) {
              const current = controls.target.length();
              const target = Math.min(MAX_ALTITUDE, current * 1.4);
              controls.target.setLength(target, true);
            }
          } catch { /* ignore */ }
        },
        resetView() {
          try {
            globeEl.current?.pointOfView?.(
              { lat: 20, lng: 0, altitude: DEFAULT_ALTITUDE },
              prefersReducedMotion.current ? 0 : 800,
            );
          } catch { /* ignore */ }
        },
        toggleAutoRotate() {
          try {
            const controls = globeEl.current?.controls();
            if (controls) {
              autoRotateRef.current = !autoRotateRef.current;
              controls.autoRotate = autoRotateRef.current;
            }
          } catch { /* ignore */ }
        },
        isAutoRotating() {
          return autoRotateRef.current;
        },
      }),
      [],
    );

    // ---- Setup OrbitControls ----
    useEffect(() => {
      if (!globeReady) return;

      const id = setTimeout(() => {
        try {
          const controls = globeEl.current?.controls();
          if (controls) {
            controls.autoRotate = !prefersReducedMotion.current;
            controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.minDistance = MIN_ALTITUDE;
            controls.maxDistance = MAX_ALTITUDE;
            controls.rotateSpeed = 0.4;
            controls.zoomSpeed = 0.8;
            controls.enablePan = false;
            autoRotateRef.current = !prefersReducedMotion.current;
          }
        } catch { /* controls not ready */ }
      }, 300);

      return () => clearTimeout(id);
    }, [globeReady]);

    // ---- Stop auto-rotation after interaction ----
    useEffect(() => {
      if (!hasInteracted || !globeReady) return;
      try {
        const controls = globeEl.current?.controls();
        if (controls) {
          controls.autoRotate = false;
          autoRotateRef.current = false;
        }
      } catch { /* ignore */ }
    }, [hasInteracted, globeReady]);

    // ---- Interaction handlers ----
    const handleGlobeClick = useCallback(
      (point: object | null) => {
        setHasInteracted(true);
        if (!point) {
          onSelectRef.current(null);
          return;
        }
        const p = point as PointData;
        if (p.isUser) return;
        if (p.event) {
          onSelectRef.current(p.event);
        }
      },
      [],
    );

    const handleGlobeHover = useCallback(
      (point: object | null) => {
        if (!point) {
          onHoverRef.current?.(null);
          return;
        }
        const p = point as PointData;
        if (p.isUser) {
          onHoverRef.current?.({ id: "user-location" } as unknown as EnvironmentalEvent);
          return;
        }
        if (p.event) {
          onHoverRef.current?.(p.event);
        }
      },
      [],
    );

    const handleGlobeReady = useCallback(() => {
      setGlobeReady(true);
    }, []);

    // ---- Point colour accessor ----
    const pointColorAccessor = useCallback(
      (d: object) => {
        const p = d as PointData;
        // Dim low-score events to reduce visual noise
        if (!p.isUser && p.severityTier === "low" && !p.isSelected) {
          return LOW_SCORE_COLOR;
        }
        return p.color;
      },
      [],
    );

    // ---- History paths for selected event ----
    const historyPathData = useMemo(() => {
      if (!historyArcs.length || historyArcs.length < 2) return [];
      // Build a single path object with coords array
      const coords = historyArcs.map((p) => [p.lat, p.lng] as [number, number]);
      return [{ coords, color: historyArcs[0].color }];
    }, [historyArcs]);

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
          // Prevent accidental text selection on drag
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "none",
        }}
      >
        <GlobeGL
          ref={globeEl}
          globeImageUrl="/textures/earth-dark.jpg"
          backgroundColor="rgba(0,0,0,0)"
          atmosphereColor="#3B6FB6"
          atmosphereAltitude={0.18}
          // 3D point markers
          pointsData={allPoints}
          pointLat="lat"
          pointLng="lng"
          pointColor={pointColorAccessor}
          pointAltitude="altitude"
          pointRadius="radius"
          pointResolution={16}
          // Animated rings
          ringsData={allRings}
          ringLat="lat"
          ringLng="lng"
          ringColor="color"
          ringMaxRadius="maxRadius"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          ringResolution={48}
          // Labels
          labelsData={allLabels}
          labelLat="lat"
          labelLng="lng"
          labelText="text"
          labelColor="color"
          labelSize="size"
          labelAltitude="altitude"
          labelDotRadius={0}
          labelResolution={3}
          // Interaction
          onGlobeClick={handleGlobeClick}
          onPointHover={handleGlobeHover as (point: object | null, prevPoint: object | null) => void}
          onGlobeReady={handleGlobeReady}
          enablePointerInteraction
          // Observation history paths (selected event)
          pathsData={historyPathData}
          pathPoints="coords"
          pathPointLat={(p) => (p as [number, number])[0]}
          pathPointLng={(p) => (p as [number, number])[1]}
          pathPointAlt={0.02}
          pathColor={(d: object) => (d as { color: string }).color}
          pathStroke={1}
          pathDashLength={0.03}
          pathDashGap={0.02}
          pathDashAnimateTime={6000}
          pathTransitionDuration={400}
        />
      </div>
    );
  },
);

export default React.memo(GlobeImpl);
