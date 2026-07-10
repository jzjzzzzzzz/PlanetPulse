"use client";

import React, { forwardRef, useRef, useImperativeHandle } from "react";
import dynamic from "next/dynamic";
import GlobeErrorBoundary from "./GlobeErrorBoundary";
import GlobeLoadingState from "./GlobeLoadingState";
import type { EnvironmentalEvent } from "@/types/environment";
import type { EnvironmentalGlobeRef } from "./GlobeImpl";

// ============================================================
// Dynamic import — GlobeImpl is heavy (react-globe.gl + Three.js)
// and must never run on the server.
// ============================================================

const GlobeImpl = dynamic(() => import("./GlobeImpl"), {
  ssr: false,
  loading: () => <GlobeLoadingState />,
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

  // Proxy the imperative handle through the dynamic-import boundary
  useImperativeHandle(
    ref,
    () => ({
      focusOnLocation(lat: number, lng: number) {
        implRef.current?.focusOnLocation(lat, lng);
      },
      zoomIn() {
        implRef.current?.zoomIn();
      },
      zoomOut() {
        implRef.current?.zoomOut();
      },
      resetView() {
        implRef.current?.resetView();
      },
      toggleAutoRotate() {
        implRef.current?.toggleAutoRotate();
      },
      isAutoRotating() {
        return implRef.current?.isAutoRotating() ?? false;
      },
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
