"use client";

import React, { forwardRef, useRef, useImperativeHandle } from "react";
import dynamic from "next/dynamic";
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
  userLatitude: number | null;
  userLongitude: number | null;
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
    }),
    []
  );

  return <GlobeImpl {...props} ref={implRef} />;
});

export default React.memo(EnvironmentalGlobe);
