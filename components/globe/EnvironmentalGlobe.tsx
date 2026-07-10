"use client";

import React, { forwardRef, useRef, useImperativeHandle } from "react";
import dynamic from "next/dynamic";
import GlobeErrorBoundary from "./GlobeErrorBoundary";
import type { EnvironmentalEvent } from "@/types/environment";
import type { EnvironmentalGlobeRef } from "./GlobeImpl";

// ============================================================
// Dynamic import — GlobeImpl must never run on server
// Loading fallback is a plain empty div (no text, no styles, no animations)
// to ensure zero hydration mismatch.
// ============================================================

const GlobeImpl = dynamic(() => import("./GlobeImpl"), {
  ssr: false,
  loading: () => <div suppressHydrationWarning style={{ position: "fixed", inset: 0, zIndex: 1 }} />,
});

// ============================================================
// Props
// ============================================================

export type EnvironmentalGlobeProps = {
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
// Component
// ============================================================

const EnvironmentalGlobe = forwardRef<
  EnvironmentalGlobeRef,
  EnvironmentalGlobeProps
>(function EnvironmentalGlobe(props, ref) {
  const implRef = useRef<EnvironmentalGlobeRef>(null);

  useImperativeHandle(
    ref,
    () => ({
      focusOnLocation(lat: number, lng: number) { implRef.current?.focusOnLocation(lat, lng); },
      zoomIn() { implRef.current?.zoomIn(); },
      zoomOut() { implRef.current?.zoomOut(); },
      resetView() { implRef.current?.resetView(); },
      toggleAutoRotate() { implRef.current?.toggleAutoRotate(); },
      isAutoRotating() { return implRef.current?.isAutoRotating() ?? false; },
    }),
    [],
  );

  return (
    <GlobeErrorBoundary>
      <GlobeImpl {...props} ref={implRef} />
    </GlobeErrorBoundary>
  );
});

export default React.memo(EnvironmentalGlobe);
